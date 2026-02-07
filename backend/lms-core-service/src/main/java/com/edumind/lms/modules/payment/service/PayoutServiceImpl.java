package com.edumind.lms.modules.payment.service;

import com.edumind.lms.modules.payment.dto.request.CreatePayoutRequestDto;
import com.edumind.lms.modules.payment.dto.request.UpdatePayoutRequestDto;
import com.edumind.lms.modules.payment.dto.response.PayoutItemResponseDto;
import com.edumind.lms.modules.payment.dto.response.PayoutResponseDto;
import com.edumind.lms.modules.payment.dto.response.PayoutSummaryDto;
import com.edumind.lms.modules.payment.entity.InstructorEarning;
import com.edumind.lms.modules.payment.entity.Payout;
import com.edumind.lms.modules.payment.entity.PayoutItem;
import com.edumind.lms.modules.payment.enums.EarningStatus;
import com.edumind.lms.modules.payment.enums.PayoutMethod;
import com.edumind.lms.modules.payment.enums.PayoutStatus;
import com.edumind.lms.modules.payment.exception.InstructorEarningNotFoundException;
import com.edumind.lms.modules.payment.gateway.GatewayPayoutResult;
import com.edumind.lms.modules.payment.gateway.GatewayPayoutStatus;
import com.edumind.lms.modules.payment.gateway.PaymentGateway;
import com.edumind.lms.modules.payment.gateway.config.PaymentGatewayRegistry;
import com.edumind.lms.modules.payment.repository.InstructorEarningRepository;
import com.edumind.lms.modules.payment.repository.PayoutItemRepository;
import com.edumind.lms.modules.payment.repository.PayoutRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class PayoutServiceImpl implements PayoutService {

    private final PayoutRepository payoutRepository;
    private final PayoutItemRepository payoutItemRepository;
    private final InstructorEarningRepository earningRepository;
    private final PaymentGatewayRegistry gatewayRegistry;
    private final NumberGeneratorService numberGeneratorService;
    private final EarningService earningService;

    @Value("${payment.payout.minimum-amount:50}")
    private BigDecimal minimumPayoutAmount;

    @Value("${payment.payout.max-retries:3}")
    private int maxRetries;

    @Override
    @Transactional
    public PayoutResponseDto createPayout(Long instructorId, CreatePayoutRequestDto request) {
        log.info("Creating payout for instructor: {}", instructorId);

        // Validate payment method and recipient info
        validatePayoutRequest(request);

        // Get available earnings
        List<InstructorEarning> availableEarnings;
        if (request.getEarningIds() != null && !request.getEarningIds().isEmpty()) {
            // Specific earnings requested
            List<InstructorEarning> candidates = request.getEarningIds().stream()
                    .map(id -> earningRepository.findById(id)
                            .orElseThrow(() -> new InstructorEarningNotFoundException(id)))
                    .filter(e -> e.getInstructorId().equals(instructorId))
                    .filter(e -> e.getStatus() == EarningStatus.AVAILABLE)
                    .collect(Collectors.toList());

            // Batch check which earnings are already in payouts
            Set<Long> alreadyInPayout = candidates.isEmpty() ? Set.of()
                    : payoutItemRepository.findEarningIdsByEarningIdIn(
                            candidates.stream().map(InstructorEarning::getId).collect(Collectors.toList()));
            availableEarnings = candidates.stream()
                    .filter(e -> !alreadyInPayout.contains(e.getId()))
                    .collect(Collectors.toList());
        } else {
            // All available earnings
            List<InstructorEarning> candidates = earningRepository.findByInstructorIdAndStatus(
                    instructorId, EarningStatus.AVAILABLE);

            // Batch check which earnings are already in payouts
            Set<Long> alreadyInPayout = candidates.isEmpty() ? Set.of()
                    : payoutItemRepository.findEarningIdsByEarningIdIn(
                            candidates.stream().map(InstructorEarning::getId).collect(Collectors.toList()));
            availableEarnings = candidates.stream()
                    .filter(e -> !alreadyInPayout.contains(e.getId()))
                    .collect(Collectors.toList());
        }

        if (availableEarnings.isEmpty()) {
            throw new IllegalArgumentException("No available earnings found for payout");
        }

        // Calculate total amount
        BigDecimal totalAmount = availableEarnings.stream()
                .map(InstructorEarning::getNetAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // Check minimum threshold
        if (totalAmount.compareTo(minimumPayoutAmount) < 0) {
            throw new IllegalArgumentException(
                    String.format("Payout amount %.2f is below minimum threshold %.2f",
                            totalAmount, minimumPayoutAmount));
        }

        // Create payout
        Payout payout = Payout.builder()
                .payoutNumber(numberGeneratorService.generatePayoutNumber())
                .instructorId(instructorId)
                .totalAmount(totalAmount)
                .currency(availableEarnings.get(0).getCurrency())
                .paymentMethod(request.getPaymentMethod())
                .status(PayoutStatus.PENDING)
                .scheduledAt(LocalDateTime.now())
                .bankAccount(request.getBankAccount())
                .paypalEmail(request.getPaypalEmail())
                .build();

        Payout savedPayout = payoutRepository.save(payout);

        // Create payout items (batch save)
        List<PayoutItem> payoutItems = availableEarnings.stream()
                .map(earning -> PayoutItem.builder()
                        .payout(savedPayout)
                        .earning(earning)
                        .build())
                .collect(Collectors.toList());
        payoutItemRepository.saveAll(payoutItems);
        payoutItems.forEach(savedPayout::addItem);

        log.info("Payout created: {} with {} earnings, total: {} {}",
                savedPayout.getPayoutNumber(), availableEarnings.size(), totalAmount, savedPayout.getCurrency());

        return toResponseDto(savedPayout);
    }

    @Override
    @Transactional
    public PayoutResponseDto updatePayout(Long payoutId, UpdatePayoutRequestDto request) {
        log.info("Updating payout: {}", payoutId);

        Payout payout = payoutRepository.findById(payoutId)
                .orElseThrow(() -> new IllegalArgumentException("Payout not found: " + payoutId));

        if (payout.getStatus() != PayoutStatus.PENDING && payout.getStatus() != PayoutStatus.FAILED) {
            throw new IllegalStateException("Only pending or failed payouts can be updated");
        }

        if (request.getPaymentMethod() != null) {
            payout.setPaymentMethod(request.getPaymentMethod());
        }
        if (request.getBankAccount() != null) {
            payout.setBankAccount(request.getBankAccount());
        }
        if (request.getPaypalEmail() != null) {
            payout.setPaypalEmail(request.getPaypalEmail());
        }

        // Reset to PENDING if it was FAILED so it can be reprocessed
        if (payout.getStatus() == PayoutStatus.FAILED) {
            payout.setStatus(PayoutStatus.PENDING);
        }

        payout = payoutRepository.save(payout);

        log.info("Payout {} updated: method={}, bankAccount={}, paypalEmail={}",
                payout.getPayoutNumber(), payout.getPaymentMethod(),
                payout.getBankAccount() != null ? "***" : null,
                payout.getPaypalEmail() != null ? "***" : null);

        return toResponseDto(payout);
    }

    @Override
    @Transactional
    public PayoutResponseDto processPayout(Long payoutId) {
        log.info("Processing payout: {}", payoutId);

        Payout payout = payoutRepository.findById(payoutId)
                .orElseThrow(() -> new IllegalArgumentException("Payout not found: " + payoutId));

        if (payout.getStatus() != PayoutStatus.PENDING && payout.getStatus() != PayoutStatus.FAILED) {
            throw new IllegalStateException("Only pending or failed payouts can be processed");
        }

        if (payout.getRetryCount() != null && payout.getRetryCount() >= maxRetries) {
            throw new IllegalStateException(
                    String.format("Payout %s has exceeded maximum retry attempts (%d/%d)",
                            payout.getPayoutNumber(), payout.getRetryCount(), maxRetries));
        }

        // Get gateway based on payment method
        PaymentGateway gateway = getGatewayForPayoutMethod(payout.getPaymentMethod());

        // Get recipient info
        String recipient = payout.getPaymentMethod() == PayoutMethod.PAYPAL
                ? payout.getPaypalEmail()
                : payout.getBankAccount();

        if (recipient == null || recipient.isBlank()) {
            throw new IllegalStateException("Recipient information not provided for payout");
        }

        // Process payout via gateway
        payout.markAsProcessing();
        payout = payoutRepository.save(payout);

        GatewayPayoutResult result;
        try {
            result = gateway.payout(recipient, payout.getTotalAmount(), payout.getCurrency());
        } catch (Exception e) {
            log.error("Payout processing failed for payout {}: {}", payoutId, e.getMessage(), e);
            payout.markAsFailed("GATEWAY_ERROR", "Gateway exception: " + e.getMessage());
            payout = payoutRepository.save(payout);
            return toResponseDto(payout);
        }

        // Handle result
        if (result.isSuccess() && result.getStatus() == GatewayPayoutStatus.COMPLETED) {
            // Success - mark earnings as paid
            payout.markAsCompleted(result.getPayoutTransactionId(), result.getRawResponse());
            payout = payoutRepository.save(payout);

            // Mark all earnings as paid
            List<PayoutItem> items = payoutItemRepository.findByPayoutId(payoutId);
            for (PayoutItem item : items) {
                earningService.markEarningsPaid(item.getEarning().getId(), payoutId.toString());
            }

            log.info("Payout processed successfully: {}", payout.getPayoutNumber());
        } else {
            // Failure
            payout.markAsFailed(
                    result.getErrorCode() != null ? result.getErrorCode() : "PAYOUT_FAILED",
                    result.getErrorMessage() != null ? result.getErrorMessage() : "Payout processing failed");
            payout = payoutRepository.save(payout);
            log.error("Payout processing failed: {}", payout.getPayoutNumber());
        }

        return toResponseDto(payout);
    }

    @Override
    @Transactional(readOnly = true)
    public PayoutResponseDto getPayoutById(Long payoutId, Long instructorId) {
        Payout payout = payoutRepository.findById(payoutId)
                .orElseThrow(() -> new IllegalArgumentException("Payout not found: " + payoutId));

        if (!payout.getInstructorId().equals(instructorId)) {
            throw new IllegalArgumentException("Payout not found: " + payoutId);
        }

        return toResponseDto(payout);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<PayoutResponseDto> getInstructorPayouts(Long instructorId, Pageable pageable) {
        Page<Payout> payouts = payoutRepository.findByInstructorIdOrderByCreatedAtDesc(instructorId, pageable);
        return payouts.map(this::toResponseDto);
    }

    @Override
    @Transactional(readOnly = true)
    public PayoutSummaryDto getPayoutSummary(Long instructorId) {
        List<Payout> allPayouts = payoutRepository.findByInstructorIdOrderByCreatedAtDesc(
                instructorId, Pageable.unpaged()).getContent();

        BigDecimal totalPayouts = allPayouts.stream()
                .filter(p -> p.getStatus() == PayoutStatus.COMPLETED)
                .map(Payout::getTotalAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal pendingPayouts = allPayouts.stream()
                .filter(p -> p.getStatus() == PayoutStatus.PENDING || p.getStatus() == PayoutStatus.PROCESSING)
                .map(Payout::getTotalAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal availableForPayout = safeBigDecimal(
                earningRepository.sumNetAmountByInstructorIdAndStatus(instructorId, EarningStatus.AVAILABLE));

        LocalDateTime lastPayoutDate = allPayouts.stream()
                .filter(p -> p.getStatus() == PayoutStatus.COMPLETED && p.getProcessedAt() != null)
                .map(Payout::getProcessedAt)
                .max(LocalDateTime::compareTo)
                .orElse(null);

        // Derive currency from instructor's earnings, falling back to payout history, then USD
        String currency = earningRepository.findTopCurrencyByInstructorId(instructorId);
        if (currency == null) {
            currency = allPayouts.stream()
                    .filter(p -> p.getCurrency() != null)
                    .map(Payout::getCurrency)
                    .findFirst()
                    .orElse("USD");
        }

        return PayoutSummaryDto.builder()
                .instructorId(instructorId)
                .totalPayouts(totalPayouts)
                .pendingPayouts(pendingPayouts)
                .availableForPayout(availableForPayout)
                .totalPayoutCount(allPayouts.size())
                .lastPayoutDate(lastPayoutDate)
                .currency(currency)
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public Page<PayoutResponseDto> getPendingPayouts(Pageable pageable) {
        Page<Payout> payouts = payoutRepository.findByStatusOrderByScheduledAtDesc(PayoutStatus.PENDING, pageable);
        return payouts.map(this::toResponseDto);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<PayoutResponseDto> getAllPayouts(Pageable pageable) {
        Page<Payout> payouts = payoutRepository.findAll(pageable);
        return payouts.map(this::toResponseDto);
    }

    @Override
    @Transactional
    public List<PayoutResponseDto> scheduleMonthlyPayouts() {
        log.info("Scheduling monthly payouts");

        // Find all instructors with available earnings
        List<Long> instructorIds = earningRepository.findDistinctInstructorIdsWithAvailableEarnings();

        List<PayoutResponseDto> createdPayouts = new ArrayList<>();

        for (Long instructorId : instructorIds) {
            try {
                // Get available earnings for this instructor
                List<InstructorEarning> candidates = earningRepository
                        .findByInstructorIdAndStatus(instructorId, EarningStatus.AVAILABLE);

                // Batch check which earnings are already in payouts
                Set<Long> alreadyInPayout = candidates.isEmpty() ? Set.of()
                        : payoutItemRepository.findEarningIdsByEarningIdIn(
                                candidates.stream().map(InstructorEarning::getId).collect(Collectors.toList()));
                List<InstructorEarning> availableEarnings = candidates.stream()
                        .filter(e -> !alreadyInPayout.contains(e.getId()))
                        .collect(Collectors.toList());

                if (availableEarnings.isEmpty()) {
                    continue;
                }

                BigDecimal totalAmount = availableEarnings.stream()
                        .map(InstructorEarning::getNetAmount)
                        .reduce(BigDecimal.ZERO, BigDecimal::add);

                // Check minimum threshold
                if (totalAmount.compareTo(minimumPayoutAmount) < 0) {
                    log.debug("Skipping payout for instructor {} - amount {} below minimum {}",
                            instructorId, totalAmount, minimumPayoutAmount);
                    continue;
                }

                // Create payout (without recipient info - admin will need to provide it)
                // For now, we'll create it in PENDING status and admin can add recipient info
                Payout payout = Payout.builder()
                        .payoutNumber(numberGeneratorService.generatePayoutNumber())
                        .instructorId(instructorId)
                        .totalAmount(totalAmount)
                        .currency(availableEarnings.get(0).getCurrency())
                        .paymentMethod(PayoutMethod.BANK_TRANSFER) // Default
                        .status(PayoutStatus.PENDING)
                        .scheduledAt(LocalDateTime.now())
                        .build();

                Payout savedPayout = payoutRepository.save(payout);

                // Create payout items (batch save)
                List<PayoutItem> payoutItems = availableEarnings.stream()
                        .map(earning -> PayoutItem.builder()
                                .payout(savedPayout)
                                .earning(earning)
                                .build())
                        .collect(Collectors.toList());
                payoutItemRepository.saveAll(payoutItems);

                createdPayouts.add(toResponseDto(savedPayout));
                log.info("Scheduled payout {} for instructor {}: {} {}",
                        savedPayout.getPayoutNumber(), instructorId, totalAmount, savedPayout.getCurrency());

            } catch (Exception e) {
                log.error("Failed to create payout for instructor {}: {}", instructorId, e.getMessage(), e);
            }
        }

        log.info("Scheduled {} payouts", createdPayouts.size());
        return createdPayouts;
    }

    // ===== Private Helpers =====

    private void validatePayoutRequest(CreatePayoutRequestDto request) {
        if (request.getPaymentMethod() == PayoutMethod.PAYPAL) {
            if (request.getPaypalEmail() == null || request.getPaypalEmail().isBlank()) {
                throw new IllegalArgumentException("PayPal email is required for PayPal payouts");
            }
        } else if (request.getPaymentMethod() == PayoutMethod.BANK_TRANSFER) {
            if (request.getBankAccount() == null || request.getBankAccount().isBlank()) {
                throw new IllegalArgumentException("Bank account is required for bank transfer payouts");
            }
        }
    }

    private PaymentGateway getGatewayForPayoutMethod(PayoutMethod method) {
        String gatewayName = method == PayoutMethod.PAYPAL ? "PAYPAL" : "SEPAY";
        return gatewayRegistry.getGateway(gatewayName)
                .orElseGet(() -> {
                    log.warn("Gateway {} not available, using active gateway", gatewayName);
                    return gatewayRegistry.getActiveGateway();
                });
    }

    private BigDecimal safeBigDecimal(BigDecimal value) {
        return value != null ? value : BigDecimal.ZERO;
    }

    private PayoutResponseDto toResponseDto(Payout payout) {
        List<PayoutItem> items = payoutItemRepository.findByPayoutIdWithEarnings(payout.getId());
        List<PayoutItemResponseDto> itemDtos = items.stream()
                .map(item -> PayoutItemResponseDto.builder()
                        .earningId(item.getEarning().getId())
                        .orderId(item.getEarning().getOrder().getId())
                        .orderNumber(item.getEarning().getOrder().getOrderNumber())
                        .courseId(item.getEarning().getCourseId())
                        .courseTitle(item.getEarning().getOrderItem() != null
                                ? item.getEarning().getOrderItem().getCourseTitle()
                                : "Unknown")
                        .netAmount(item.getEarning().getNetAmount())
                        .currency(item.getEarning().getCurrency())
                        .build())
                .collect(Collectors.toList());

        return PayoutResponseDto.builder()
                .id(payout.getId())
                .payoutNumber(payout.getPayoutNumber())
                .instructorId(payout.getInstructorId())
                .totalAmount(payout.getTotalAmount())
                .currency(payout.getCurrency())
                .paymentMethod(payout.getPaymentMethod())
                .status(payout.getStatus())
                .scheduledAt(payout.getScheduledAt())
                .processedAt(payout.getProcessedAt())
                .gatewayTransactionId(payout.getGatewayTransactionId())
                .failureReason(payout.getFailureReason())
                .failureCode(payout.getFailureCode())
                .retryCount(payout.getRetryCount())
                .items(itemDtos)
                .earningsCount(itemDtos.size())
                .createdAt(payout.getCreatedAt())
                .updatedAt(payout.getUpdatedAt())
                .build();
    }
}
