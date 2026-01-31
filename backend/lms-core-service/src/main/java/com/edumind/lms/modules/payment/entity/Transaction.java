package com.edumind.lms.modules.payment.entity;

import com.edumind.lms.modules.payment.enums.PaymentMethod;
import com.edumind.lms.modules.payment.enums.TransactionStatus;
import com.edumind.lms.shared.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "transactions", schema = "payment")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Transaction extends BaseEntity {
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id", nullable = false)
    private Order order;

    @Column(name = "transaction_number", nullable = false, unique = true, length = 50)
    private String transactionNumber;

    // Gateway info
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private PaymentMethod gateway;

    @Column(name = "gateway_transaction_id", length = 100)
    private String gatewayTransactionId;

    // Original gateway order ID (e.g., PayPal Order ID) - preserved for lookups after capture
    // gatewayTransactionId gets updated to Capture ID after capture, but we need the original for retries
    @Column(name = "gateway_order_id", length = 100)
    private String gatewayOrderId;

    @Column(name = "gateway_response", columnDefinition = "TEXT")
    private String gatewayResponse;

    // Amount in USD
    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal amount;

    @Column(length = 3)
    @Builder.Default
    private String currency = "USD";

    // For SePay: VND conversion
    @Column(name = "exchange_rate", precision = 15, scale = 6)
    private BigDecimal exchangeRate;

    @Column(name = "local_amount", precision = 15, scale = 2)
    private BigDecimal localAmount;

    @Column(name = "local_currency", length = 3)
    private String localCurrency;

    // Status
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private TransactionStatus status = TransactionStatus.PENDING;

    @Column(name = "failure_reason", length = 500)
    private String failureReason;

    @Column(name = "failure_code", length = 50)
    private String failureCode;

    @Column(name = "redirect_url", length = 500)
    private String redirectUrl;

    // Timestamps
    @Column(name = "processed_at")
    private LocalDateTime processedAt;

    // Helper methods
    public boolean isPending() {
        return status == TransactionStatus.PENDING;
    }

    public boolean isSuccess() {
        return status == TransactionStatus.SUCCESS;
    }

    public boolean isFailed() {
        return status == TransactionStatus.FAILED;
    }

    public boolean isRefunded() {
        return status == TransactionStatus.REFUNDED;
    }

    public void markAsSuccess(String gatewayTxnId, String response) {
        this.status = TransactionStatus.SUCCESS;
        this.gatewayTransactionId = gatewayTxnId;
        this.gatewayResponse = response;
        this.processedAt = LocalDateTime.now();
    }

    public void markAsFailed(String reason, String response) {
        this.status = TransactionStatus.FAILED;
        this.failureReason = reason;
        this.gatewayResponse = response;
        this.processedAt = LocalDateTime.now();
    }

    public void markAsRefunded() {
        this.status = TransactionStatus.REFUNDED;
    }
}
