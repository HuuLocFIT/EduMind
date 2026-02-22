package com.edumind.lms.modules.payment.service;

import com.edumind.common.response.ApiResponse;
import com.edumind.lms.modules.course.api.EnrollmentQueryService;
import com.edumind.lms.modules.course.api.dto.EnrollmentInfo;
import com.edumind.lms.modules.course.dto.response.UserPublicProfileResponse;
import com.edumind.lms.modules.payment.dto.response.RefundPolicyResponseDto;
import com.edumind.lms.modules.payment.dto.response.RefundResponseDto;
import com.edumind.lms.shared.client.UserClient;
import com.edumind.lms.shared.exception.ResourceNotFoundException;
import com.edumind.lms.modules.payment.entity.InstructorEarning;
import com.edumind.lms.modules.payment.entity.Order;
import com.edumind.lms.modules.payment.entity.OrderItem;
import com.edumind.lms.modules.payment.entity.RefundRequest;
import com.edumind.lms.modules.payment.entity.Transaction;
import com.edumind.lms.modules.payment.enums.OrderStatus;
import com.edumind.lms.modules.payment.enums.PaymentMethod;
import com.edumind.lms.modules.payment.enums.RefundStatus;
import com.edumind.lms.modules.payment.enums.TransactionStatus;
import com.edumind.lms.modules.payment.exception.OrderNotFoundException;
import com.edumind.lms.modules.payment.gateway.GatewayRefundResult;
import com.edumind.lms.modules.payment.gateway.GatewayRefundStatus;
import com.edumind.lms.modules.payment.gateway.PaymentGateway;
import com.edumind.lms.modules.payment.gateway.config.PaymentGatewayRegistry;
import com.edumind.lms.modules.payment.repository.*;
import com.edumind.lms.modules.payment.event.RefundCompletedEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class RefundServiceImpl implements RefundService {

    private final RefundRequestRepository refundRequestRepository;
    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final TransactionRepository transactionRepository;
    private final InstructorEarningRepository earningRepository;
    private final EnrollmentQueryService enrollmentQueryService;
    private final PaymentGatewayRegistry gatewayRegistry;
    private final NumberGeneratorService numberGeneratorService;
    private final UserClient userClient;
    private final ApplicationEventPublisher eventPublisher;

    @org.springframework.context.annotation.Lazy
    @org.springframework.beans.factory.annotation.Autowired
    private RefundService self;

    @Value("${payment.refund.auto-approve-days:7}")
    private int autoApproveDays;

    @Value("${payment.refund.max-refund-days:30}")
    private int maxRefundDays;

    @Value("${payment.refund.partial-refund-threshold:50}")
    private int partialRefundThreshold;

    @Override
    @Transactional
    public RefundResponseDto requestRefund(Long userId, Long orderId, com.edumind.lms.modules.payment.dto.request.RefundRequest request) {
        log.info("Processing refund request for user: {}, order: {}", userId, orderId);

        // 1. Validate order
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new OrderNotFoundException(orderId));

        if (!order.getUserId().equals(userId)) {
            throw new OrderNotFoundException(orderId);
        }

        if (order.getStatus() != OrderStatus.COMPLETED) {
            throw new IllegalArgumentException("Only completed orders can be refunded");
        }

        // 2. Check if refund already exists
        if (refundRequestRepository.existsByOrderId(orderId)) {
            RefundRequest existing = refundRequestRepository.findByOrderId(orderId)
                    .orElseThrow(() -> new IllegalStateException("Refund request exists but not found"));
            return toResponseDto(existing);
        }

        // 3. Calculate refund amount based on policy
        RefundPolicyResponseDto policy = calculateRefundPolicy(order);
        if (!policy.isEligible()) {
            throw new IllegalArgumentException("Order is not eligible for refund: " + policy.getEligibilityReason());
        }

        BigDecimal refundAmount = request.getAmount() != null
                ? request.getAmount()
                : policy.getEligibleRefundAmount();

        if (refundAmount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Refund amount must be positive");
        }

        if (refundAmount.compareTo(order.getTotalAmount()) > 0) {
            throw new IllegalArgumentException("Refund amount cannot exceed order total");
        }

        // Clamp refund amount to policy-eligible maximum
        if (refundAmount.compareTo(policy.getEligibleRefundAmount()) > 0) {
            refundAmount = policy.getEligibleRefundAmount();
        }

        // 3.5. Validate bank account information for manual refund methods (SePay)
        boolean requiresBankInfo = !supportsAutoRefund(order.getPaymentMethod());
        if (requiresBankInfo) {
            if (request.getBankName() == null || request.getBankName().trim().isEmpty()) {
                throw new IllegalArgumentException("Bank name is required for SePay refunds");
            }
            if (request.getAccountHolderName() == null || request.getAccountHolderName().trim().isEmpty()) {
                throw new IllegalArgumentException("Account holder name is required for SePay refunds");
            }
            if (request.getAccountNumber() == null || request.getAccountNumber().trim().isEmpty()) {
                throw new IllegalArgumentException("Account number is required for SePay refunds");
            }
        }

        // 4. Create refund request
        RefundRequest refundRequestEntity = RefundRequest.builder()
                .order(order)
                .userId(userId)
                .requestedAmount(refundAmount)
                .currency(order.getCurrency())
                .reason(request.getReason())
                .bankName(request.getBankName())
                .accountHolderName(request.getAccountHolderName())
                .accountNumber(request.getAccountNumber())
                .swiftCode(request.getSwiftCode())
                .bankAddress(request.getBankAddress())
                .status(RefundStatus.PENDING)
                .requestedAt(LocalDateTime.now())
                .build();

        try {
            refundRequestEntity = refundRequestRepository.save(refundRequestEntity);
        } catch (DataIntegrityViolationException e) {
            // Unique constraint on order_id — concurrent request already created a refund
            log.warn("Duplicate refund request for order {} (concurrent race condition)", orderId);
            RefundRequest existing = refundRequestRepository.findByOrderId(orderId)
                    .orElseThrow(() -> new IllegalStateException("Refund request exists but not found"));
            return toResponseDto(existing);
        }
        log.info("Refund request created: {}", refundRequestEntity.getId());

        // 5. Auto-approve if eligible
        if (!policy.isRequiresAdminApproval()) {
            log.info("Auto-approving refund request: {}", refundRequestEntity.getId());
            refundRequestEntity.markAsApproved(null); // No admin ID for auto-approval
            refundRequestEntity = refundRequestRepository.save(refundRequestEntity);

            // Process immediately (via proxy to ensure @Transactional is respected)
            return self.processRefund(refundRequestEntity.getId());
        }

        return toResponseDto(refundRequestEntity);
    }

    @Override
    @Transactional(readOnly = true)
    public RefundPolicyResponseDto getRefundPolicy(Long userId, Long orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new OrderNotFoundException(orderId));

        if (!order.getUserId().equals(userId)) {
            throw new OrderNotFoundException(orderId);
        }

        return calculateRefundPolicy(order);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<RefundResponseDto> getMyRefunds(Long userId, Pageable pageable) {
        Page<RefundRequest> refunds = refundRequestRepository.findByUserIdOrderByRequestedAtDesc(userId, pageable);
        return refunds.map(this::toResponseDto);
    }

    @Override
    @Transactional(readOnly = true)
    public RefundResponseDto getRefundById(Long userId, Long refundId) {
        RefundRequest refund = refundRequestRepository.findById(refundId)
                .orElseThrow(() -> new IllegalArgumentException("Refund request not found: " + refundId));

        if (!refund.getUserId().equals(userId)) {
            throw new IllegalArgumentException("Refund request not found: " + refundId);
        }

        return toResponseDto(refund);
    }

    @Override
    @Transactional(readOnly = true)
    public RefundResponseDto getRefundByOrderId(Long userId, Long orderId) {
        RefundRequest refund = refundRequestRepository.findByOrderId(orderId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Refund not found for order: " + orderId));

        if (!refund.getUserId().equals(userId)) {
            throw new com.edumind.lms.shared.exception.ResourceNotFoundException(
                    "Refund not found for order: " + orderId);
        }

        return toResponseDto(refund);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<RefundResponseDto> getPendingRefunds(Pageable pageable) {
        // Return PENDING (awaiting approval), AWAITING_MANUAL_REFUND (awaiting manual transfer), and FAILED (retry needed)
        Page<RefundRequest> refunds = refundRequestRepository.findByStatusInOrderByRequestedAtDesc(
                List.of(RefundStatus.PENDING, RefundStatus.AWAITING_MANUAL_REFUND, RefundStatus.FAILED), pageable);
        return refunds.map(this::toResponseDto);
    }

    @Override
    @Transactional
    public RefundResponseDto approveRefund(Long refundId, Long adminId) {
        log.info("Admin {} approving refund request: {}", adminId, refundId);

        RefundRequest refund = refundRequestRepository.findById(refundId)
                .orElseThrow(() -> new IllegalArgumentException("Refund request not found: " + refundId));

        if (refund.getStatus() != RefundStatus.PENDING) {
            throw new IllegalStateException("Only pending refunds can be approved");
        }

        Order order = refund.getOrder();
        
        // Check if gateway supports auto-refund
        boolean supportsAutoRefund = supportsAutoRefund(order.getPaymentMethod());
        
        if (supportsAutoRefund) {
            // Auto-refund gateway: approve and process immediately
            refund.markAsApproved(adminId);
            refund = refundRequestRepository.save(refund);
            return self.processRefund(refundId);
        } else {
            // Manual refund gateway (e.g., SePay): approve and mark as awaiting manual transfer
            log.info("Refund {} approved for manual gateway ({}). Admin must manually transfer money.",
                    refundId, order.getPaymentMethod());
            refund.markAsAwaitingManualRefund(adminId);
            refund = refundRequestRepository.save(refund);
            return toResponseDto(refund);
        }
    }

    @Override
    @Transactional
    public RefundResponseDto rejectRefund(Long refundId, Long adminId, String reason) {
        log.info("Admin {} rejecting refund request: {}", adminId, refundId);

        RefundRequest refund = refundRequestRepository.findById(refundId)
                .orElseThrow(() -> new IllegalArgumentException("Refund request not found: " + refundId));

        if (refund.getStatus() != RefundStatus.PENDING) {
            throw new IllegalStateException("Only pending refunds can be rejected");
        }

        refund.markAsRejected(adminId, reason);
        refund = refundRequestRepository.save(refund);

        return toResponseDto(refund);
    }

    @Override
    @Transactional
    public RefundResponseDto processRefund(Long refundId) {
        log.info("Processing refund: {}", refundId);

        RefundRequest refund = refundRequestRepository.findById(refundId)
                .orElseThrow(() -> new IllegalArgumentException("Refund request not found: " + refundId));

        if (refund.getStatus() != RefundStatus.APPROVED) {
            throw new IllegalStateException("Only approved refunds can be processed");
        }

        Order order = refund.getOrder();

        // 1. Find the successful transaction
        Transaction transaction = transactionRepository.findFirstByOrderIdAndStatusOrderByCreatedAtDesc(
                order.getId(), TransactionStatus.SUCCESS)
                .orElseThrow(() -> new IllegalStateException("No successful transaction found for order"));

        if (transaction.getGatewayTransactionId() == null) {
            throw new IllegalStateException("Transaction has no gateway transaction ID");
        }

        // 2. Get gateway and process refund
        PaymentGateway gateway = gatewayRegistry.getGateway(order.getPaymentMethod().name())
                .orElseGet(() -> gatewayRegistry.getActiveGateway());

        GatewayRefundResult refundResult = gateway.refund(
                transaction.getGatewayTransactionId(),
                refund.getRequestedAmount(),
                refund.getCurrency()
        );

        // 3. Handle refund result
        if (refundResult.isSuccess() && refundResult.getStatus() == GatewayRefundStatus.COMPLETED) {
            // Auto-refund completed successfully
            completeRefund(refund, order, transaction, refundResult);
            log.info("Refund processed successfully: {}", refundId);
        } else if (!refundResult.isSuccess() && refundResult.getStatus() == GatewayRefundStatus.PENDING) {
            // Gateway cannot auto-process (e.g., SePay bank transfer)
            // Check if this gateway supports auto-refund
            boolean supportsAutoRefund = supportsAutoRefund(order.getPaymentMethod());
            if (!supportsAutoRefund) {
                // Manual gateway (SePay) - mark as AWAITING_MANUAL_REFUND
                // This should not happen if approveRefund() logic is correct, but handle it defensively
                log.warn("Manual gateway returned PENDING for request {}: {}. "
                        + "This should have been caught in approveRefund(). Marking as AWAITING_MANUAL_REFUND.",
                        refundId, refundResult.getErrorMessage());
                refund.markAsAwaitingManualRefund(refund.getApprovedBy());
            } else {
                // Auto-refund gateway returned PENDING (unusual) - mark as FAILED for retry
                log.error("Auto-refund gateway returned PENDING for request {}: {}. Marking as FAILED.",
                        refundId, refundResult.getErrorMessage());
                refund.markAsFailed("Gateway returned PENDING status: " + refundResult.getErrorMessage());
            }
            refund = refundRequestRepository.save(refund);
        } else {
            // Refund failed — mark as FAILED so admin can retry
            log.error("Refund processing failed for request {}: {}",
                    refundId, refundResult.getErrorMessage());
            refund.markAsFailed("Gateway error: " + refundResult.getErrorMessage());
            refund = refundRequestRepository.save(refund);
        }

        return toResponseDto(refund);
    }

    @Override
    @Transactional
    public RefundResponseDto confirmManualRefund(Long refundId, Long adminId, String bankTransferReference) {
        log.info("Admin {} confirming manual refund completion for refund: {}, bank transfer reference: {}",
                adminId, refundId, bankTransferReference);

        RefundRequest refund = refundRequestRepository.findById(refundId)
                .orElseThrow(() -> new IllegalArgumentException("Refund request not found: " + refundId));

        if (refund.getStatus() != RefundStatus.AWAITING_MANUAL_REFUND) {
            throw new IllegalStateException("Only refunds awaiting manual transfer can be confirmed. Current status: " + refund.getStatus());
        }

        Order order = refund.getOrder();

        // 1. Find the successful transaction
        Transaction transaction = transactionRepository.findFirstByOrderIdAndStatusOrderByCreatedAtDesc(
                order.getId(), TransactionStatus.SUCCESS)
                .orElseThrow(() -> new IllegalStateException("No successful transaction found for order"));

        // 2. Create a mock GatewayRefundResult for manual refund
        GatewayRefundResult manualRefundResult = GatewayRefundResult.builder()
                .success(true)
                .status(GatewayRefundStatus.COMPLETED)
                .originalTransactionId(transaction.getGatewayTransactionId())
                .gatewayName(order.getPaymentMethod().name())
                .amount(refund.getRequestedAmount())
                .currency(refund.getCurrency())
                .refundTransactionId(bankTransferReference != null ? bankTransferReference : "MANUAL-" + System.currentTimeMillis())
                .rawResponse("Manual bank transfer confirmed by admin " + adminId + ". Reference: " + bankTransferReference)
                .build();

        // 3. Complete the refund using shared logic
        completeRefund(refund, order, transaction, manualRefundResult);

        log.info("Manual refund confirmed and completed: {}", refundId);
        return toResponseDto(refund);
    }

    /**
     * Calculate refund policy for an order
     */
    private RefundPolicyResponseDto calculateRefundPolicy(Order order) {
        if (order.getStatus() != OrderStatus.COMPLETED) {
            return RefundPolicyResponseDto.builder()
                    .isEligible(false)
                    .eligibilityReason("Order is not completed")
                    .build();
        }

        if (order.getCompletedAt() == null) {
            return RefundPolicyResponseDto.builder()
                    .isEligible(false)
                    .eligibilityReason("Order completion date not available")
                    .build();
        }

        long daysSincePurchase = ChronoUnit.DAYS.between(order.getCompletedAt(), LocalDateTime.now());

        // Check if outside refund window
        if (daysSincePurchase > maxRefundDays) {
            return RefundPolicyResponseDto.builder()
                    .autoApproveDays(autoApproveDays)
                    .maxRefundDays(maxRefundDays)
                    .partialRefundThreshold(partialRefundThreshold)
                    .isEligible(false)
                    .eligibilityReason("Refund window expired (" + daysSincePurchase + " days since purchase)")
                    .build();
        }

        // Calculate course access percentage
        int courseAccessPercentage = calculateCourseAccessPercentage(order);

        // Check if payment method requires manual refund (e.g., SePay bank transfer)
        boolean isManualRefundGateway = order.getPaymentMethod() == PaymentMethod.SEPAY;

        // Determine refund amount and approval requirement
        BigDecimal refundAmount;
        boolean requiresAdminApproval;
        String eligibilityReason;

        // SePay (bank transfer) always requires admin approval - no auto-refund possible
        if (isManualRefundGateway) {
            if (daysSincePurchase <= maxRefundDays && courseAccessPercentage <= partialRefundThreshold) {
                refundAmount = order.getTotalAmount();
                requiresAdminApproval = true;
                eligibilityReason = "Eligible for full refund (requires admin approval - manual bank transfer)";
            } else if (daysSincePurchase <= maxRefundDays && courseAccessPercentage > partialRefundThreshold) {
                // Partial refund: high course access
                BigDecimal accessRatio = BigDecimal.valueOf(courseAccessPercentage).divide(BigDecimal.valueOf(100), 2, java.math.RoundingMode.HALF_UP);
                BigDecimal refundRatio = BigDecimal.ONE.subtract(accessRatio);
                refundAmount = order.getTotalAmount().multiply(refundRatio);
                requiresAdminApproval = true;
                eligibilityReason = "Eligible for partial refund (" + refundAmount + " " + order.getCurrency() + " - requires admin approval)";
            } else {
                refundAmount = BigDecimal.ZERO;
                requiresAdminApproval = false;
                eligibilityReason = "Not eligible for refund";
            }
        } else if (daysSincePurchase <= autoApproveDays && courseAccessPercentage == 0) {
            // Auto-approve: within auto-approve window and no course access (only for auto-refund gateways)
            refundAmount = order.getTotalAmount();
            requiresAdminApproval = false;
            eligibilityReason = "Eligible for full refund (auto-approve)";
        } else if (daysSincePurchase <= maxRefundDays && courseAccessPercentage <= partialRefundThreshold) {
            // Admin approval: within refund window and low course access
            refundAmount = order.getTotalAmount();
            requiresAdminApproval = true;
            eligibilityReason = "Eligible for full refund (requires admin approval)";
        } else if (daysSincePurchase <= maxRefundDays && courseAccessPercentage > partialRefundThreshold) {
            // Partial refund: high course access
            // Calculate partial refund: (100 - access%) of order amount
            BigDecimal accessRatio = BigDecimal.valueOf(courseAccessPercentage).divide(BigDecimal.valueOf(100), 2, java.math.RoundingMode.HALF_UP);
            BigDecimal refundRatio = BigDecimal.ONE.subtract(accessRatio);
            refundAmount = order.getTotalAmount().multiply(refundRatio);
            requiresAdminApproval = true;
            eligibilityReason = "Eligible for partial refund (" + refundAmount + " " + order.getCurrency() + ")";
        } else {
            refundAmount = BigDecimal.ZERO;
            requiresAdminApproval = false;
            eligibilityReason = "Not eligible for refund";
        }

        return RefundPolicyResponseDto.builder()
                .autoApproveDays(autoApproveDays)
                .maxRefundDays(maxRefundDays)
                .partialRefundThreshold(partialRefundThreshold)
                .eligibleRefundAmount(refundAmount)
                .isEligible(refundAmount.compareTo(BigDecimal.ZERO) > 0)
                .eligibilityReason(eligibilityReason)
                .requiresAdminApproval(requiresAdminApproval)
                .build();
    }

    /**
     * Calculate average course access percentage for all courses in the order
     */
    private int calculateCourseAccessPercentage(Order order) {
        List<OrderItem> items = orderItemRepository.findByOrderId(order.getId());
        if (items.isEmpty()) {
            return 0;
        }

        int totalAccess = 0;
        int courseCount = 0;

        for (OrderItem item : items) {
            EnrollmentInfo enrollment = enrollmentQueryService.getEnrollmentInfo(item.getCourseId(), order.getUserId())
                    .orElse(null);

            if (enrollment != null) {
                if ("COMPLETED".equalsIgnoreCase(enrollment.status())) {
                    totalAccess += 100;
                } else {
                    totalAccess += enrollment.progressPercentage() != null
                            ? enrollment.progressPercentage()
                            : 0;
                }
                courseCount++;
            }
        }

        return courseCount > 0 ? (int) Math.round((double) totalAccess / courseCount) : 0;
    }

    /**
     * Revoke enrollments for all courses in the order
     */
    /**
     * Check if payment method supports automatic refund processing
     */
    private boolean supportsAutoRefund(PaymentMethod paymentMethod) {
        // SePay (bank transfer) requires manual refund
        // PayPal and other gateways support auto-refund
        return paymentMethod != PaymentMethod.SEPAY;
    }

    /**
     * Complete a refund by updating all related entities (order, transaction, earnings, enrollments)
     * This is shared logic used by both processRefund() (auto-refund) and confirmManualRefund() (manual refund)
     */
    private void completeRefund(
            RefundRequest refund,
            Order order,
            Transaction transaction,
            GatewayRefundResult refundResult) {
        
        // Update refund request
        String refundTransactionId = "REF-" + numberGeneratorService.generateTransactionNumber();
        refund.markAsCompleted(
                refundTransactionId,
                refundResult.getRefundTransactionId(),
                refundResult.getRawResponse()
        );
        refund = refundRequestRepository.save(refund);

        // Update order
        order.markAsRefunded("Refund processed: " + refund.getReason());
        orderRepository.save(order);

        // Update transaction
        transaction.markAsRefunded();
        transactionRepository.save(transaction);

        // Mark earnings as refunded (proportional for partial refunds)
        List<InstructorEarning> earnings = earningRepository.findByOrderId(order.getId());
        boolean isFullRefund = refund.getRequestedAmount().compareTo(order.getTotalAmount()) >= 0;

        if (isFullRefund) {
            for (InstructorEarning earning : earnings) {
                if (earning.isPaid()) {
                    log.warn("MANUAL RECOVERY REQUIRED: Earning {} for instructor {} is already PAID (amount: {}). "
                            + "Refund {} requires manual clawback from instructor.",
                            earning.getId(), earning.getInstructorId(), earning.getNetAmount(), refund.getId());
                }
                earning.markAsRefunded();
            }
        } else {
            BigDecimal remainingRefund = refund.getRequestedAmount();
            for (InstructorEarning earning : earnings) {
                if (remainingRefund.compareTo(BigDecimal.ZERO) <= 0) break;
                BigDecimal earningRefundAmount = earning.getNetAmount().min(remainingRefund);
                remainingRefund = remainingRefund.subtract(earningRefundAmount);
                if (earning.isPaid()) {
                    log.warn("MANUAL RECOVERY REQUIRED: Earning {} for instructor {} is already PAID (amount: {}). "
                            + "Refund {} requires manual clawback from instructor.",
                            earning.getId(), earning.getInstructorId(), earningRefundAmount, refund.getId());
                }
                earning.markAsRefunded();
            }
        }
        earningRepository.saveAll(earnings);

        // Revoke enrollments if full refund
        if (isFullRefund) {
            List<Long> courseIds = orderItemRepository.findByOrderId(order.getId()).stream()
                    .map(OrderItem::getCourseId)
                    .toList();

            eventPublisher.publishEvent(new RefundCompletedEvent(
                    this,
                    order.getId(),
                    order.getOrderNumber(),
                    order.getUserId(),
                    courseIds,
                    refund.getRequestedAmount(),
                    true
            ));
        }
    }

    /**
     * Convert entity to DTO
     */
    private RefundResponseDto toResponseDto(RefundRequest refund) {
        RefundResponseDto.RefundResponseDtoBuilder builder = RefundResponseDto.builder()
                .id(refund.getId())
                .orderId(refund.getOrder().getId())
                .orderNumber(refund.getOrder().getOrderNumber())
                .userId(refund.getUserId())
                .requestedAmount(refund.getRequestedAmount())
                .currency(refund.getCurrency())
                .reason(refund.getReason())
                .bankName(refund.getBankName())
                .accountHolderName(refund.getAccountHolderName())
                .accountNumber(refund.getAccountNumber())
                .swiftCode(refund.getSwiftCode())
                .bankAddress(refund.getBankAddress())
                .status(refund.getStatus())
                .requestedAt(refund.getRequestedAt())
                .approvedAt(refund.getApprovedAt())
                .approvedBy(refund.getApprovedBy())
                .processedAt(refund.getProcessedAt())
                .refundTransactionId(refund.getRefundTransactionId())
                .gatewayRefundId(refund.getGatewayRefundId())
                .gatewayResponse(refund.getGatewayResponse())
                .rejectionReason(refund.getRejectionReason())
                .rejectedAt(refund.getRejectedAt())
                .rejectedBy(refund.getRejectedBy())
                .createdAt(refund.getCreatedAt())
                .updatedAt(refund.getUpdatedAt());

        // Fetch and populate approved by name
        if (refund.getApprovedBy() != null) {
            builder.approvedByName(fetchUserName(refund.getApprovedBy()));
        }

        // Fetch and populate rejected by name
        if (refund.getRejectedBy() != null) {
            builder.rejectedByName(fetchUserName(refund.getRejectedBy()));
        }

        return builder.build();
    }

    /**
     * Fetch user display name from auth service
     * Returns null if user not found or error occurs
     */
    private String fetchUserName(Long userId) {
        try {
            ApiResponse<UserPublicProfileResponse> response = userClient.getUserPublicProfile(userId);
            if (response != null && response.getData() != null) {
                UserPublicProfileResponse user = response.getData();
                // Prefer displayName, fallback to firstName + lastName, or "Unknown User"
                if (user.displayName != null && !user.displayName.trim().isEmpty()) {
                    return user.displayName;
                } else if (user.firstName != null || user.lastName != null) {
                    String firstName = user.firstName != null ? user.firstName : "";
                    String lastName = user.lastName != null ? user.lastName : "";
                    return (firstName + " " + lastName).trim();
                }
            }
        } catch (Exception e) {
            log.warn("Failed to fetch user profile for userId {}: {}", userId, e.getMessage());
        }
        return null; // Return null if user not found or error
    }
}
