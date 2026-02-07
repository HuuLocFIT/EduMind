package com.edumind.lms.modules.payment.entity;

import com.edumind.lms.modules.payment.enums.RefundStatus;
import com.edumind.lms.shared.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "refund_requests", schema = "payment")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RefundRequest extends BaseEntity {

    @Version
    private Long version;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id", nullable = false)
    private Order order;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    // Refund details
    @Column(name = "requested_amount", nullable = false, precision = 10, scale = 2)
    private BigDecimal requestedAmount;

    @Column(length = 3)
    @Builder.Default
    private String currency = "USD";

    @Column(columnDefinition = "TEXT", nullable = false)
    private String reason;

    // Status workflow
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private RefundStatus status = RefundStatus.PENDING;

    // Timestamps
    @Column(name = "requested_at", nullable = false)
    @Builder.Default
    private LocalDateTime requestedAt = LocalDateTime.now();

    @Column(name = "approved_at")
    private LocalDateTime approvedAt;

    @Column(name = "approved_by")
    private Long approvedBy;  // Admin user ID

    @Column(name = "processed_at")
    private LocalDateTime processedAt;

    // Gateway refund tracking
    @Column(name = "refund_transaction_id", length = 100)
    private String refundTransactionId;

    @Column(name = "gateway_refund_id", length = 100)
    private String gatewayRefundId;

    @Column(name = "gateway_response", columnDefinition = "TEXT")
    private String gatewayResponse;

    // Rejection info
    @Column(name = "rejection_reason", columnDefinition = "TEXT")
    private String rejectionReason;

    @Column(name = "rejected_at")
    private LocalDateTime rejectedAt;

    @Column(name = "rejected_by")
    private Long rejectedBy;  // Admin user ID

    // Helper methods
    public boolean isPending() {
        return status == RefundStatus.PENDING;
    }

    public boolean isApproved() {
        return status == RefundStatus.APPROVED;
    }

    public boolean isRejected() {
        return status == RefundStatus.REJECTED;
    }

    public boolean isCompleted() {
        return status == RefundStatus.COMPLETED;
    }

    public void markAsApproved(Long adminId) {
        this.status = RefundStatus.APPROVED;
        this.approvedAt = LocalDateTime.now();
        this.approvedBy = adminId;
    }

    public void markAsRejected(Long adminId, String reason) {
        this.status = RefundStatus.REJECTED;
        this.rejectedAt = LocalDateTime.now();
        this.rejectedBy = adminId;
        this.rejectionReason = reason;
    }

    public void markAsCompleted(String refundTransactionId, String gatewayRefundId, String gatewayResponse) {
        this.status = RefundStatus.COMPLETED;
        this.processedAt = LocalDateTime.now();
        this.refundTransactionId = refundTransactionId;
        this.gatewayRefundId = gatewayRefundId;
        this.gatewayResponse = gatewayResponse;
    }

    public boolean isFailed() {
        return status == RefundStatus.FAILED;
    }

    public void markAsFailed(String errorMessage) {
        this.status = RefundStatus.FAILED;
        this.processedAt = LocalDateTime.now();
        this.gatewayResponse = errorMessage;
    }
}
