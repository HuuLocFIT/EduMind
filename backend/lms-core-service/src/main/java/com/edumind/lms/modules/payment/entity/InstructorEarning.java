package com.edumind.lms.modules.payment.entity;

import com.edumind.lms.modules.payment.enums.EarningStatus;
import com.edumind.lms.shared.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "instructor_earnings", schema = "payment")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InstructorEarning extends BaseEntity {
    @Column(name = "instructor_id", nullable = false)
    private Long instructorId;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_item_id", nullable = false)
    private OrderItem orderItem;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id", nullable = false)
    private Order order;

    @Column(name = "course_id", nullable = false)
    private Long courseId;

    // Amounts
    @Column(name = "gross_amount", nullable = false, precision = 10, scale = 2)
    private BigDecimal grossAmount;

    @Column(name = "platform_fee_percent", nullable = false, precision = 5, scale = 2)
    private BigDecimal platformFeePercent;

    @Column(name = "platform_fee_amount", nullable = false, precision = 10, scale = 2)
    private BigDecimal platformFeeAmount;

    @Column(name = "net_amount", nullable = false, precision = 10, scale = 2)
    private BigDecimal netAmount;

    @Column(length = 3)
    @Builder.Default
    private String currency = "USD";

    // Status
    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    @Builder.Default
    private EarningStatus status = EarningStatus.PENDING;

    // Payout tracking (for future)
    @Column(name = "payout_id")
    private Long payoutId;

    @Column(name = "paid_at")
    private LocalDateTime paidAt;

    // Helper methods
    public boolean isPending() {
        return status == EarningStatus.PENDING;
    }

    public boolean isAvailable() {
        return status == EarningStatus.AVAILABLE;
    }

    public boolean isPaid() {
        return status == EarningStatus.PAID;
    }

    public boolean isRefunded() {
        return status == EarningStatus.REFUNDED;
    }

    public void markAsAvailable() {
        this.status = EarningStatus.AVAILABLE;
    }

    public void markAsPaid(Long payoutId) {
        this.status = EarningStatus.PAID;
        this.payoutId = payoutId;
        this.paidAt = LocalDateTime.now();
    }

    public void markAsRefunded() {
        this.status = EarningStatus.REFUNDED;
    }

    // Static factory method for creating earnings
    public static InstructorEarning create(
            OrderItem orderItem,
            Order order,
            BigDecimal platformFeePercent
    ) {
        BigDecimal grossAmount = orderItem.getFinalPrice();
        BigDecimal feeAmount = grossAmount
                .multiply(platformFeePercent)
                .divide(BigDecimal.valueOf(100), 2, java.math.RoundingMode.HALF_UP);
        BigDecimal netAmount = grossAmount.subtract(feeAmount);

        return InstructorEarning.builder()
                .instructorId(orderItem.getInstructorId())
                .orderItem(orderItem)
                .order(order)
                .courseId(orderItem.getCourseId())
                .grossAmount(grossAmount)
                .platformFeePercent(platformFeePercent)
                .platformFeeAmount(feeAmount)
                .netAmount(netAmount)
                .currency(orderItem.getCurrency())
                .status(EarningStatus.PENDING)
                .build();
    }
}
