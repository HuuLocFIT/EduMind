package com.edumind.lms.modules.payment.entity;

import com.edumind.lms.modules.payment.enums.PayoutMethod;
import com.edumind.lms.modules.payment.enums.PayoutStatus;
import com.edumind.lms.shared.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "payouts", schema = "payment")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Payout extends BaseEntity {

    @Column(name = "payout_number", nullable = false, unique = true, length = 50)
    private String payoutNumber;

    @Column(name = "instructor_id", nullable = false)
    private Long instructorId;

    // Amounts
    @Column(name = "total_amount", nullable = false, precision = 10, scale = 2)
    private BigDecimal totalAmount;

    @Column(length = 3)
    @Builder.Default
    private String currency = "USD";

    // Payment method
    @Enumerated(EnumType.STRING)
    @Column(name = "payment_method", nullable = false, length = 20)
    private PayoutMethod paymentMethod;

    // Status
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private PayoutStatus status = PayoutStatus.PENDING;

    // Timestamps
    @Column(name = "scheduled_at")
    private LocalDateTime scheduledAt;

    @Column(name = "processed_at")
    private LocalDateTime processedAt;

    // Gateway tracking
    @Column(name = "gateway_transaction_id", length = 100)
    private String gatewayTransactionId;

    @Column(name = "gateway_response", columnDefinition = "TEXT")
    private String gatewayResponse;

    // Recipient info (encrypted)
    @Column(name = "bank_account", length = 255)
    private String bankAccount;  // Encrypted

    @Column(name = "paypal_email", length = 255)
    private String paypalEmail;  // Encrypted

    // Failure tracking
    @Column(name = "failure_reason", columnDefinition = "TEXT")
    private String failureReason;

    @Column(name = "failure_code", length = 50)
    private String failureCode;

    @Column(name = "retry_count")
    @Builder.Default
    private Integer retryCount = 0;

    // Relationships
    @OneToMany(mappedBy = "payout", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<PayoutItem> items = new ArrayList<>();

    // Helper methods
    public boolean isPending() {
        return status == PayoutStatus.PENDING;
    }

    public boolean isProcessing() {
        return status == PayoutStatus.PROCESSING;
    }

    public boolean isCompleted() {
        return status == PayoutStatus.COMPLETED;
    }

    public boolean isFailed() {
        return status == PayoutStatus.FAILED;
    }

    public void markAsProcessing() {
        this.status = PayoutStatus.PROCESSING;
    }

    public void markAsCompleted(String gatewayTransactionId, String gatewayResponse) {
        this.status = PayoutStatus.COMPLETED;
        this.processedAt = LocalDateTime.now();
        this.gatewayTransactionId = gatewayTransactionId;
        this.gatewayResponse = gatewayResponse;
    }

    public void markAsFailed(String failureCode, String failureReason) {
        if (this.status != PayoutStatus.PROCESSING) {
            throw new IllegalStateException(
                    "Cannot mark payout as FAILED from status " + this.status + ". Only PROCESSING payouts can fail.");
        }
        this.status = PayoutStatus.FAILED;
        this.failureCode = failureCode;
        this.failureReason = failureReason;
        this.retryCount = (this.retryCount != null ? this.retryCount : 0) + 1;
    }

    public void addItem(PayoutItem item) {
        items.add(item);
        item.setPayout(this);
    }
}
