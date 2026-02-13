package com.edumind.lms.modules.payment.service;

import com.edumind.lms.modules.payment.dto.request.CreatePayoutRequestDto;
import com.edumind.lms.modules.payment.dto.request.UpdatePayoutRequestDto;
import com.edumind.lms.modules.payment.dto.request.PayoutSettingsDto;
import com.edumind.lms.modules.payment.dto.response.PayoutItemResponseDto;
import com.edumind.lms.modules.payment.dto.response.PayoutResponseDto;
import com.edumind.lms.modules.payment.dto.response.PayoutSummaryDto;
import com.edumind.lms.modules.payment.entity.InstructorEarning;
import com.edumind.lms.modules.payment.entity.InstructorPayoutSettings;
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
import com.edumind.lms.modules.payment.repository.InstructorPayoutSettingsRepository;
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
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class PayoutServiceImpl implements PayoutService {

    private final PayoutRepository payoutRepository;
    private final PayoutItemRepository payoutItemRepository;
    private final InstructorEarningRepository earningRepository;
    private final InstructorPayoutSettingsRepository payoutSettingsRepository;
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

        // If no recipient info provided, try to load from instructor payout settings
        if (request.getPaymentMethod() == null
                && request.getBankAccount() == null
                && request.getPaypalEmail() == null
                && request.getBankName() == null
                && request.getAccountHolderName() == null
                && request.getSwiftCode() == null
                && request.getBankAddress() == null) {
            InstructorPayoutSettings settings = payoutSettingsRepository.findByInstructorId(instructorId)
                    .orElse(null);
            if (settings != null) {
                request.setPaymentMethod(settings.getPreferredMethod());
                request.setBankName(settings.getBankName());
                request.setAccountHolderName(settings.getAccountHolderName());
                request.setBankAccount(settings.getBankAccount());
                request.setSwiftCode(settings.getSwiftCode());
                request.setBankAddress(settings.getBankAddress());
                request.setPaypalEmail(settings.getPaypalEmail());
            }
        }

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
                .bankName(request.getBankName())
                .accountHolderName(request.getAccountHolderName())
                .swiftCode(request.getSwiftCode())
                .bankAddress(request.getBankAddress())
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
        if (request.getBankName() != null) {
            payout.setBankName(request.getBankName());
        }
        if (request.getAccountHolderName() != null) {
            payout.setAccountHolderName(request.getAccountHolderName());
        }
        if (request.getSwiftCode() != null) {
            payout.setSwiftCode(request.getSwiftCode());
        }
        if (request.getBankAddress() != null) {
            payout.setBankAddress(request.getBankAddress());
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

        // --- Layer 1: Pre-retry status check ---
        // If this payout was previously sent to the gateway (has a batch ID),
        // check its current status before re-sending to prevent double payouts.
        if (payout.getGatewayTransactionId() != null) {
            log.info("Payout {} has existing gateway transaction ID {}. Checking status before retry.",
                    payout.getPayoutNumber(), payout.getGatewayTransactionId());
            try {
                GatewayPayoutResult existingStatus = gateway.getPayoutStatus(payout.getGatewayTransactionId());

                if (existingStatus.isSuccess() && existingStatus.getStatus() == GatewayPayoutStatus.COMPLETED) {
                    // Previous batch already succeeded — mark as COMPLETED, no re-send
                    log.info("Pre-retry check: payout {} already COMPLETED at gateway. Recovering.",
                            payout.getPayoutNumber());
                    payout.markAsCompleted(existingStatus.getPayoutTransactionId(), existingStatus.getRawResponse());
                    payout = payoutRepository.save(payout);
                    markEarningsAsPaid(payoutId);
                    return toResponseDto(payout);
                }

                if (existingStatus.getStatus() == GatewayPayoutStatus.PENDING) {
                    // Still processing at gateway — keep as PROCESSING, do NOT re-send
                    log.info("Pre-retry check: payout {} still PENDING at gateway. Keeping as PROCESSING.",
                            payout.getPayoutNumber());
                    payout.markAsProcessing();
                    payout = payoutRepository.save(payout);
                    return toResponseDto(payout);
                }

                // If FAILED at gateway, proceed with retry below (deterministic sender_batch_id is safety net)
                log.info("Pre-retry check: payout {} is {} at gateway. Proceeding with retry.",
                        payout.getPayoutNumber(), existingStatus.getStatus());
            } catch (Exception e) {
                log.warn("Pre-retry status check failed for payout {} (batch {}). Proceeding with retry cautiously: {}",
                        payout.getPayoutNumber(), payout.getGatewayTransactionId(), e.getMessage());
                // Proceed with retry — Layer 2 (deterministic sender_batch_id) is the safety net
            }
        }

        // Process payout via gateway
        payout.markAsProcessing();
        payout = payoutRepository.save(payout);

        GatewayPayoutResult result;
        try {
            // --- Layer 2: Deterministic sender_batch_id via payoutReference ---
            result = gateway.payout(recipient, payout.getTotalAmount(), payout.getCurrency(), payout.getPayoutNumber());
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
            markEarningsAsPaid(payoutId);
            log.info("Payout processed successfully: {}", payout.getPayoutNumber());
        } else if (!result.isSuccess() && result.getStatus() == GatewayPayoutStatus.PENDING) {
            // Gateway cannot auto-process (e.g., SePay bank transfer)
            if (!supportsAutoPayout(payout.getPaymentMethod())) {
                // Manual gateway — mark as AWAITING_MANUAL_PAYOUT
                log.info("Gateway requires manual payout for {}: {}",
                        payout.getPayoutNumber(), result.getErrorMessage());
                payout.markAsAwaitingManualPayout();
            } else {
                // Auto-payout gateway returned PENDING — payout was accepted but not yet confirmed.
                // Keep as PROCESSING and store the gateway transaction ID for later status checks.
                log.info("Auto-payout gateway returned PENDING for {}: batch/transaction ID={}. Keeping as PROCESSING.",
                        payout.getPayoutNumber(), result.getPayoutTransactionId());
                payout.setGatewayTransactionId(result.getPayoutTransactionId());
            }
            payout = payoutRepository.save(payout);
        } else {
            // --- Layer 2 recovery: Handle DUPLICATE_BATCH ---
            // PayPal rejected because sender_batch_id was already used.
            // The previous batch may have succeeded — check its status.
            if ("DUPLICATE_BATCH".equals(result.getErrorCode()) && payout.getGatewayTransactionId() != null) {
                log.info("DUPLICATE_BATCH for payout {}. Checking existing batch {} status.",
                        payout.getPayoutNumber(), payout.getGatewayTransactionId());
                try {
                    GatewayPayoutResult batchStatus = gateway.getPayoutStatus(payout.getGatewayTransactionId());
                    if (batchStatus.isSuccess() && batchStatus.getStatus() == GatewayPayoutStatus.COMPLETED) {
                        log.info("DUPLICATE_BATCH recovery: payout {} batch is COMPLETED. Marking as completed.",
                                payout.getPayoutNumber());
                        payout.markAsCompleted(batchStatus.getPayoutTransactionId(), batchStatus.getRawResponse());
                        payout = payoutRepository.save(payout);
                        markEarningsAsPaid(payoutId);
                        return toResponseDto(payout);
                    }
                } catch (Exception e) {
                    log.warn("DUPLICATE_BATCH recovery failed for payout {}: {}", payout.getPayoutNumber(), e.getMessage());
                }
            }

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
        List<PayoutStatus> statuses = List.of(
                PayoutStatus.PENDING, PayoutStatus.AWAITING_MANUAL_PAYOUT, PayoutStatus.FAILED);
        Page<Payout> payouts = payoutRepository.findByStatusInOrderByScheduledAtDesc(statuses, pageable);
        return payouts.map(this::toResponseDto);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<PayoutResponseDto> getAllPayouts(Pageable pageable) {
        Page<Payout> payouts = payoutRepository.findAll(pageable);
        return payouts.map(this::toResponseDto);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<PayoutResponseDto> getAllPayouts(PayoutStatus status, Pageable pageable) {
        Page<Payout> payouts = payoutRepository.findByStatusOrderByScheduledAtDesc(status, pageable);
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

                // Load instructor payout settings (if any)
                InstructorPayoutSettings settings = payoutSettingsRepository.findByInstructorId(instructorId)
                        .orElse(null);

                PayoutMethod method = settings != null && settings.getPreferredMethod() != null
                        ? settings.getPreferredMethod()
                        : PayoutMethod.BANK_TRANSFER;

                // Create payout, prefilling recipient info from settings when available
                Payout payout = Payout.builder()
                        .payoutNumber(numberGeneratorService.generatePayoutNumber())
                        .instructorId(instructorId)
                        .totalAmount(totalAmount)
                        .currency(availableEarnings.get(0).getCurrency())
                        .paymentMethod(method)
                        .status(PayoutStatus.PENDING)
                        .scheduledAt(LocalDateTime.now())
                        .bankAccount(settings != null ? settings.getBankAccount() : null)
                        .bankName(settings != null ? settings.getBankName() : null)
                        .accountHolderName(settings != null ? settings.getAccountHolderName() : null)
                        .swiftCode(settings != null ? settings.getSwiftCode() : null)
                        .bankAddress(settings != null ? settings.getBankAddress() : null)
                        .paypalEmail(settings != null ? settings.getPaypalEmail() : null)
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

    @Override
    @Transactional(readOnly = true)
    public PayoutSettingsDto getPayoutSettings(Long instructorId) {
        InstructorPayoutSettings settings = payoutSettingsRepository.findByInstructorId(instructorId)
                .orElse(null);

        if (settings == null) {
            // Default to BANK_TRANSFER with no details to encourage configuration,
            // but keep response nullable-friendly on the frontend.
            return PayoutSettingsDto.builder()
                    .preferredMethod(PayoutMethod.BANK_TRANSFER)
                    .build();
        }

        return PayoutSettingsDto.builder()
                .preferredMethod(settings.getPreferredMethod())
                .bankName(settings.getBankName())
                .accountHolderName(settings.getAccountHolderName())
                .bankAccount(settings.getBankAccount())
                .swiftCode(settings.getSwiftCode())
                .bankAddress(settings.getBankAddress())
                .paypalEmail(settings.getPaypalEmail())
                .build();
    }

    @Override
    @Transactional
    public PayoutSettingsDto updatePayoutSettings(Long instructorId, PayoutSettingsDto request) {
        validatePayoutSettings(request);

        InstructorPayoutSettings settings = payoutSettingsRepository.findByInstructorId(instructorId)
                .orElseGet(() -> InstructorPayoutSettings.builder()
                        .instructorId(instructorId)
                        .build());

        settings.setPreferredMethod(request.getPreferredMethod());
        settings.setBankName(request.getBankName());
        settings.setAccountHolderName(request.getAccountHolderName());
        settings.setBankAccount(request.getBankAccount());
        settings.setSwiftCode(request.getSwiftCode());
        settings.setBankAddress(request.getBankAddress());
        settings.setPaypalEmail(request.getPaypalEmail());

        InstructorPayoutSettings saved = payoutSettingsRepository.save(settings);

        return PayoutSettingsDto.builder()
                .preferredMethod(saved.getPreferredMethod())
                .bankName(saved.getBankName())
                .accountHolderName(saved.getAccountHolderName())
                .bankAccount(saved.getBankAccount())
                .swiftCode(saved.getSwiftCode())
                .bankAddress(saved.getBankAddress())
                .paypalEmail(saved.getPaypalEmail())
                .build();
    }

    @Override
    @Transactional
    public PayoutResponseDto confirmManualPayout(Long payoutId, Long adminId, String bankTransferReference) {
        log.info("Admin {} confirming manual payout for payout: {}, bank transfer reference: {}",
                adminId, payoutId, bankTransferReference);

        Payout payout = payoutRepository.findById(payoutId)
                .orElseThrow(() -> new IllegalArgumentException("Payout not found: " + payoutId));

        if (payout.getStatus() != PayoutStatus.AWAITING_MANUAL_PAYOUT) {
            throw new IllegalStateException(
                    "Only payouts awaiting manual transfer can be confirmed. Current status: " + payout.getStatus());
        }

        // Mark payout as completed with bank transfer reference
        String reference = bankTransferReference != null ? bankTransferReference : "MANUAL-" + System.currentTimeMillis();
        payout.markAsCompleted(reference,
                "Manual bank transfer confirmed by admin " + adminId + ". Reference: " + bankTransferReference);
        payout = payoutRepository.save(payout);

        // Mark all associated earnings as paid
        markEarningsAsPaid(payoutId);

        log.info("Manual payout confirmed and completed: {}", payout.getPayoutNumber());
        return toResponseDto(payout);
    }

    // ===== Payout Webhook Handler =====

    @Override
    @Transactional
    public void handlePayoutWebhook(String eventType, Map<String, Object> rawResource) {
        log.info("Handling payout webhook: eventType={}", eventType);

        if (rawResource == null) {
            log.warn("Payout webhook has null resource. Ignoring.");
            return;
        }

        // Extract payout_batch_id from the resource.
        // For PAYOUTS-ITEM events, the batch ID is in payout_batch_id field.
        // For PAYOUTSBATCH events, the batch ID is in batch_header.payout_batch_id.
        String batchId = extractBatchId(rawResource, eventType);
        if (batchId == null) {
            log.warn("Could not extract payout_batch_id from webhook resource. EventType={}, keys={}",
                    eventType, rawResource.keySet());
            return;
        }

        // Find payout by gateway transaction ID (batch ID)
        Payout payout = payoutRepository.findByGatewayTransactionId(batchId).orElse(null);
        if (payout == null) {
            log.warn("No payout found for gateway batch ID: {}. This may be a payout created outside our system.", batchId);
            return;
        }

        // Idempotency: skip if already in a terminal state
        if (payout.getStatus() == PayoutStatus.COMPLETED) {
            log.info("Payout {} already COMPLETED. Skipping duplicate webhook.", payout.getPayoutNumber());
            return;
        }

        // Route by event type suffix
        String eventSuffix = eventType.replace("PAYMENT.PAYOUTS-ITEM.", "").replace("PAYMENT.PAYOUTSBATCH.", "BATCH.");

        switch (eventSuffix) {
            case "SUCCEEDED", "BATCH.SUCCESS" -> {
                log.info("Payout webhook: {} marked as COMPLETED via {}", payout.getPayoutNumber(), eventType);
                String itemId = (String) rawResource.get("payout_item_id");
                payout.markAsCompleted(
                        itemId != null ? itemId : batchId,
                        "Confirmed via webhook: " + eventType);
                payoutRepository.save(payout);
                markEarningsAsPaid(payout.getId());
            }
            case "FAILED", "BLOCKED", "DENIED", "RETURNED", "CANCELED", "BATCH.DENIED" -> {
                log.warn("Payout webhook: {} marked as FAILED via {}", payout.getPayoutNumber(), eventType);
                // markAsFailed requires PROCESSING state
                if (payout.getStatus() != PayoutStatus.PROCESSING) {
                    payout.markAsProcessing();
                }
                String errorDetail = extractErrorDetail(rawResource);
                payout.markAsFailed(
                        "WEBHOOK_" + eventSuffix,
                        errorDetail != null ? errorDetail : "Failed via webhook: " + eventType);
                payoutRepository.save(payout);
            }
            case "UNCLAIMED" -> {
                log.warn("Payout webhook: {} UNCLAIMED — recipient may not have PayPal account", payout.getPayoutNumber());
                if (payout.getStatus() != PayoutStatus.PROCESSING) {
                    payout.markAsProcessing();
                }
                payout.markAsFailed("WEBHOOK_UNCLAIMED",
                        "Payout unclaimed. Recipient may not have a PayPal account or hasn't accepted the payment.");
                payoutRepository.save(payout);
            }
            default -> log.debug("Ignoring unhandled payout webhook event suffix: {}", eventSuffix);
        }
    }

    @SuppressWarnings("unchecked")
    private String extractBatchId(Map<String, Object> rawResource, String eventType) {
        // For PAYOUTS-ITEM events: payout_batch_id is a top-level field
        String batchId = (String) rawResource.get("payout_batch_id");
        if (batchId != null) {
            return batchId;
        }

        // For PAYOUTSBATCH events: batch_header.payout_batch_id
        Object batchHeader = rawResource.get("batch_header");
        if (batchHeader instanceof Map) {
            batchId = (String) ((Map<String, Object>) batchHeader).get("payout_batch_id");
            if (batchId != null) {
                return batchId;
            }
        }

        return null;
    }

    @SuppressWarnings("unchecked")
    private String extractErrorDetail(Map<String, Object> rawResource) {
        Object errors = rawResource.get("errors");
        if (errors instanceof Map) {
            Map<String, Object> errorMap = (Map<String, Object>) errors;
            String name = (String) errorMap.get("name");
            String message = (String) errorMap.get("message");
            if (name != null || message != null) {
                return (name != null ? name : "") + (message != null ? ": " + message : "");
            }
        }
        return null;
    }

    /**
     * Mark all earnings associated with a payout as paid.
     */
    private void markEarningsAsPaid(Long payoutId) {
        List<PayoutItem> items = payoutItemRepository.findByPayoutId(payoutId);
        for (PayoutItem item : items) {
            earningService.markEarningsPaid(item.getEarning().getId(), payoutId.toString());
        }
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

    private void validatePayoutSettings(PayoutSettingsDto request) {
        if (request.getPreferredMethod() == PayoutMethod.BANK_TRANSFER) {
            if (request.getBankAccount() == null || request.getBankAccount().isBlank()) {
                throw new IllegalArgumentException("Bank account is required for bank transfer payouts");
            }
            if (request.getBankName() == null || request.getBankName().isBlank()) {
                throw new IllegalArgumentException("Bank name is required for bank transfer payouts");
            }
            if (request.getAccountHolderName() == null || request.getAccountHolderName().isBlank()) {
                throw new IllegalArgumentException("Account holder name is required for bank transfer payouts");
            }
        } else if (request.getPreferredMethod() == PayoutMethod.PAYPAL) {
            if (request.getPaypalEmail() == null || request.getPaypalEmail().isBlank()) {
                throw new IllegalArgumentException("PayPal email is required for PayPal payouts");
            }
        }
    }

    @Override
    @Transactional
    public void checkProcessingPayouts() {
        List<Payout> processingPayouts = payoutRepository.findByStatusOrderByScheduledAtAsc(PayoutStatus.PROCESSING);
        if (processingPayouts.isEmpty()) {
            return;
        }

        log.info("Checking {} processing payouts for status updates", processingPayouts.size());

        for (Payout payout : processingPayouts) {
            if (payout.getGatewayTransactionId() == null) {
                log.warn("Processing payout {} has no gateway transaction ID, skipping", payout.getPayoutNumber());
                continue;
            }

            try {
                PaymentGateway gateway = getGatewayForPayoutMethod(payout.getPaymentMethod());
                GatewayPayoutResult result = gateway.getPayoutStatus(payout.getGatewayTransactionId());

                if (result.isSuccess() && result.getStatus() == GatewayPayoutStatus.COMPLETED) {
                    payout.markAsCompleted(result.getPayoutTransactionId(), result.getRawResponse());
                    payoutRepository.save(payout);
                    markEarningsAsPaid(payout.getId());
                    log.info("Processing payout {} confirmed as COMPLETED", payout.getPayoutNumber());

                } else if (!result.isSuccess() && result.getStatus() == GatewayPayoutStatus.FAILED) {
                    payout.markAsFailed(
                            result.getErrorCode() != null ? result.getErrorCode() : "PAYOUT_FAILED",
                            result.getErrorMessage() != null ? result.getErrorMessage() : "Payout failed");
                    payoutRepository.save(payout);
                    log.error("Processing payout {} confirmed as FAILED: {}", payout.getPayoutNumber(), result.getErrorMessage());

                } else {
                    log.debug("Payout {} still processing at gateway", payout.getPayoutNumber());
                }
            } catch (Exception e) {
                log.error("Error checking processing payout {}: {}", payout.getPayoutNumber(), e.getMessage());
            }
        }
    }

    private boolean supportsAutoPayout(PayoutMethod method) {
        // SePay (BANK_TRANSFER) does not support automatic payouts
        return method == PayoutMethod.PAYPAL;
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
                .bankName(payout.getBankName())
                .accountHolderName(payout.getAccountHolderName())
                .bankAccount(payout.getBankAccount())
                .swiftCode(payout.getSwiftCode())
                .bankAddress(payout.getBankAddress())
                .paypalEmail(payout.getPaypalEmail())
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
