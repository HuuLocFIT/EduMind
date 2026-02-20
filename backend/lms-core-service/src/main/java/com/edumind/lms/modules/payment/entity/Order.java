package com.edumind.lms.modules.payment.entity;

import com.edumind.lms.modules.payment.enums.OrderStatus;
import com.edumind.lms.modules.payment.enums.PaymentMethod;
import com.edumind.lms.shared.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Entity
@Table(name = "orders", schema = "payment")
@NamedEntityGraphs({
        @NamedEntityGraph(
                name = "Order.withItems",
                attributeNodes = @NamedAttributeNode("items")
        ),
        @NamedEntityGraph(
                name = "Order.withItemsAndTransactions",
                attributeNodes = {
                        @NamedAttributeNode("items"),
                        @NamedAttributeNode("transactions")
                }
        )
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Order extends BaseEntity {

    @Version
    @Column(name = "version")
    private Long version;

    @Column(name = "order_number", nullable = false, unique = true, length = 50)
    private String orderNumber;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    // Pricing
    @Column(nullable = false, precision = 10, scale = 2)
    @Builder.Default
    private BigDecimal subtotal = BigDecimal.ZERO;

    @Column(name = "discount_total", precision = 10, scale = 2)
    @Builder.Default
    private BigDecimal discountTotal = BigDecimal.ZERO;

    @Column(name = "total_amount", nullable = false, precision = 10, scale = 2)
    @Builder.Default
    private BigDecimal totalAmount = BigDecimal.ZERO;

    @Column(length = 3)
    @Builder.Default
    private String currency = "USD";

    // Payment info
    @Enumerated(EnumType.STRING)
    @Column(name = "payment_method", length = 20)
    private PaymentMethod paymentMethod;

    // Status
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private OrderStatus status = OrderStatus.PENDING;

    // Timestamps
    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @Column(name = "expires_at")
    private LocalDateTime expiresAt;

    @Column(name = "retry_count")
    @Builder.Default
    private Integer retryCount = 0;

    @Column(name = "last_payment_attempt_at")
    private LocalDateTime lastPaymentAttemptAt;

    // Customer info
    @Column(name = "customer_email", length = 255)
    private String customerEmail;

    @Column(name = "customer_name", length = 255)
    private String customerName;

    @Column(name = "billing_address", columnDefinition = "TEXT")
    private String billingAddress;

    // Metadata
    @Column(name = "ip_address", length = 45)
    private String ipAddress;

    @Column(name = "user_agent", length = 500)
    private String userAgent;

    @Column(name = "failure_reason", length = 500)
    private String failureReason;

    // Idempotency key to prevent duplicate orders on client retry
    @Column(name = "idempotency_key", length = 64, unique = true)
    private String idempotencyKey;

    // Proper refund tracking (separate from failureReason)
    @Column(name = "refund_reason", length = 500)
    private String refundReason;

    @Column(name = "refunded_at")
    private LocalDateTime refundedAt;

    // Tracks whether async side effects (enrollment, earnings, invoice, cart) were published
    @Column(name = "side_effects_published")
    @Builder.Default
    private boolean sideEffectsPublished = false;

    // Relationships
    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private Set<OrderItem> items = new HashSet<>();

    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<Transaction> transactions = new ArrayList<>();

    @OneToOne(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true)
    private Invoice invoice;

    // Helper methods
    public void addItem(OrderItem item) {
        items.add(item);
        item.setOrder(this);
    }

    public void addTransaction(Transaction transaction) {
        transactions.add(transaction);
        transaction.setOrder(this);
    }

    public int getItemCount() {
        return items.size();
    }

    public boolean isPending() {
        return status == OrderStatus.PENDING;
    }

    public boolean isCompleted() {
        return status == OrderStatus.COMPLETED;
    }

    public boolean isFailed() {
        return status == OrderStatus.FAILED;
    }

    public boolean isFreeOrder() {
        return totalAmount.compareTo(BigDecimal.ZERO) == 0;
    }

    public void markAsCompleted() {
        this.status = OrderStatus.COMPLETED;
        this.completedAt = LocalDateTime.now();
    }

    public void markAsFailed() {
        this.status = OrderStatus.FAILED;
    }

    /**
     * Mark order as refunded with reason.
     * Use dedicated refund fields instead of failureReason.
     */
    public void markAsRefunded(String reason) {
        this.status = OrderStatus.REFUNDED;
        this.refundReason = reason;
        this.refundedAt = LocalDateTime.now();
    }

    /**
     * @deprecated Use markAsRefunded(String reason) instead
     */
    @Deprecated
    public void markAsRefunded() {
        this.status = OrderStatus.REFUNDED;
        this.refundedAt = LocalDateTime.now();
    }

    public void markAsCancelled() {
        this.status = OrderStatus.CANCELLED;
    }

    public Transaction getLatestTransaction() {
        if (transactions.isEmpty()) return null;
        return transactions.get(transactions.size() - 1);
    }
}
