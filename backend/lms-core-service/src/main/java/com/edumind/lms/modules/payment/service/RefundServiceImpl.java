package com.edumind.lms.modules.payment.service;

import com.edumind.lms.modules.course.entity.Enrollment;
import com.edumind.lms.modules.course.enums.EnrollmentStatus;
import com.edumind.lms.modules.course.repository.EnrollmentRepository;
import com.edumind.lms.modules.payment.dto.response.RefundPolicyResponseDto;
import com.edumind.lms.modules.payment.dto.response.RefundResponseDto;
import com.edumind.lms.modules.payment.entity.InstructorEarning;
import com.edumind.lms.modules.payment.entity.Order;
import com.edumind.lms.modules.payment.entity.OrderItem;
import com.edumind.lms.modules.payment.entity.Transaction;
import com.edumind.lms.modules.payment.enums.OrderStatus;
import com.edumind.lms.modules.payment.enums.RefundStatus;
import com.edumind.lms.modules.payment.enums.TransactionStatus;
import com.edumind.lms.modules.payment.exception.OrderNotFoundException;
import com.edumind.lms.modules.payment.gateway.GatewayRefundResult;
import com.edumind.lms.modules.payment.gateway.GatewayRefundStatus;
import com.edumind.lms.modules.payment.gateway.PaymentGateway;
import com.edumind.lms.modules.payment.gateway.config.PaymentGatewayRegistry;
import com.edumind.lms.modules.payment.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
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
    private final EnrollmentRepository enrollmentRepository;
    private final PaymentGatewayRegistry gatewayRegistry;
    private final NumberGeneratorService numberGeneratorService;

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
            com.edumind.lms.modules.payment.entity.RefundRequest existing = refundRequestRepository.findByOrderId(orderId)
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

        // 4. Create refund request
        com.edumind.lms.modules.payment.entity.RefundRequest refundRequestEntity = com.edumind.lms.modules.payment.entity.RefundRequest.builder()
                .order(order)
                .userId(userId)
                .requestedAmount(refundAmount)
                .currency(order.getCurrency())
                .reason(request.getReason())
                .status(RefundStatus.PENDING)
                .requestedAt(LocalDateTime.now())
                .build();

        try {
            refundRequestEntity = refundRequestRepository.save(refundRequestEntity);
        } catch (DataIntegrityViolationException e) {
            // Unique constraint on order_id — concurrent request already created a refund
            log.warn("Duplicate refund request for order {} (concurrent race condition)", orderId);
            com.edumind.lms.modules.payment.entity.RefundRequest existing = refundRequestRepository.findByOrderId(orderId)
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
        Page<com.edumind.lms.modules.payment.entity.RefundRequest> refunds = refundRequestRepository.findByUserIdOrderByRequestedAtDesc(userId, pageable);
        return refunds.map(this::toResponseDto);
    }

    @Override
    @Transactional(readOnly = true)
    public RefundResponseDto getRefundById(Long userId, Long refundId) {
        com.edumind.lms.modules.payment.entity.RefundRequest refund = refundRequestRepository.findById(refundId)
                .orElseThrow(() -> new IllegalArgumentException("Refund request not found: " + refundId));

        if (!refund.getUserId().equals(userId)) {
            throw new IllegalArgumentException("Refund request not found: " + refundId);
        }

        return toResponseDto(refund);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<RefundResponseDto> getPendingRefunds(Pageable pageable) {
        Page<com.edumind.lms.modules.payment.entity.RefundRequest> refunds = refundRequestRepository.findByStatusOrderByRequestedAtDesc(
                RefundStatus.PENDING, pageable);
        return refunds.map(this::toResponseDto);
    }

    @Override
    @Transactional
    public RefundResponseDto approveRefund(Long refundId, Long adminId) {
        log.info("Admin {} approving refund request: {}", adminId, refundId);

        com.edumind.lms.modules.payment.entity.RefundRequest refund = refundRequestRepository.findById(refundId)
                .orElseThrow(() -> new IllegalArgumentException("Refund request not found: " + refundId));

        if (refund.getStatus() != RefundStatus.PENDING) {
            throw new IllegalStateException("Only pending refunds can be approved");
        }

        refund.markAsApproved(adminId);
        refund = refundRequestRepository.save(refund);

        // Process immediately after approval (via proxy to ensure @Transactional is respected)
        return self.processRefund(refundId);
    }

    @Override
    @Transactional
    public RefundResponseDto rejectRefund(Long refundId, Long adminId, String reason) {
        log.info("Admin {} rejecting refund request: {}", adminId, refundId);

        com.edumind.lms.modules.payment.entity.RefundRequest refund = refundRequestRepository.findById(refundId)
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

        com.edumind.lms.modules.payment.entity.RefundRequest refund = refundRequestRepository.findById(refundId)
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
                                earning.getId(), earning.getInstructorId(), earning.getNetAmount(), refundId);
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
                                earning.getId(), earning.getInstructorId(), earningRefundAmount, refundId);
                    }
                    earning.markAsRefunded();
                }
            }
            earningRepository.saveAll(earnings);

            // Revoke enrollments if full refund
            if (isFullRefund) {
                revokeEnrollments(order);
            }

            log.info("Refund processed successfully: {}", refundId);
        } else if (refundResult.getStatus() == GatewayRefundStatus.PENDING) {
            // Gateway cannot auto-process (e.g., SePay bank transfer) — mark as FAILED for admin attention
            log.warn("Refund requires manual processing for request {}: {}",
                    refundId, refundResult.getErrorMessage());
            refund.markAsFailed("Manual refund required: " + refundResult.getErrorMessage());
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

        // Determine refund amount and approval requirement
        BigDecimal refundAmount;
        boolean requiresAdminApproval;
        String eligibilityReason;

        if (daysSincePurchase <= autoApproveDays && courseAccessPercentage == 0) {
            // Auto-approve: within auto-approve window and no course access
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
            Enrollment enrollment = enrollmentRepository.findByCourseIdAndStudentId(
                    item.getCourseId(), order.getUserId())
                    .orElse(null);

            if (enrollment != null) {
                if (enrollment.getStatus() == EnrollmentStatus.COMPLETED) {
                    totalAccess += 100;
                } else {
                    totalAccess += enrollment.getProgressPercentage() != null
                            ? enrollment.getProgressPercentage()
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
    private void revokeEnrollments(Order order) {
        List<OrderItem> items = orderItemRepository.findByOrderId(order.getId());
        for (OrderItem item : items) {
            Enrollment enrollment = enrollmentRepository.findByCourseIdAndStudentId(
                    item.getCourseId(), order.getUserId())
                    .orElse(null);

            if (enrollment != null && enrollment.getStatus() == EnrollmentStatus.ACTIVE) {
                enrollment.setStatus(EnrollmentStatus.DROPPED);
                enrollmentRepository.save(enrollment);
                log.info("Enrollment revoked for user {} in course {} due to refund",
                        order.getUserId(), item.getCourseId());
            }
        }
    }

    /**
     * Convert entity to DTO
     */
    private RefundResponseDto toResponseDto(com.edumind.lms.modules.payment.entity.RefundRequest refund) {
        return RefundResponseDto.builder()
                .id(refund.getId())
                .orderId(refund.getOrder().getId())
                .orderNumber(refund.getOrder().getOrderNumber())
                .userId(refund.getUserId())
                .requestedAmount(refund.getRequestedAmount())
                .currency(refund.getCurrency())
                .reason(refund.getReason())
                .status(refund.getStatus())
                .requestedAt(refund.getRequestedAt())
                .approvedAt(refund.getApprovedAt())
                .approvedBy(refund.getApprovedBy())
                .processedAt(refund.getProcessedAt())
                .refundTransactionId(refund.getRefundTransactionId())
                .gatewayRefundId(refund.getGatewayRefundId())
                .rejectionReason(refund.getRejectionReason())
                .rejectedAt(refund.getRejectedAt())
                .rejectedBy(refund.getRejectedBy())
                .createdAt(refund.getCreatedAt())
                .updatedAt(refund.getUpdatedAt())
                .build();
    }
}
