package com.edumind.lms.modules.payment.event;

import com.edumind.lms.shared.event.DomainEvent;
import lombok.Getter;

import java.math.BigDecimal;
import java.util.List;

@Getter
public class RefundCompletedEvent extends DomainEvent {
    private final Long orderId;
    private final String orderNumber;
    private final Long userId;
    private final List<Long> courseIds;
    private final BigDecimal refundAmount;
    private final boolean fullRefund;

    public RefundCompletedEvent(
            Object source,
            Long orderId,
            String orderNumber,
            Long userId,
            List<Long> courseIds,
            BigDecimal refundAmount,
            boolean fullRefund
    ) {
        super(source);
        this.orderId = orderId;
        this.orderNumber = orderNumber;
        this.userId = userId;
        this.courseIds = courseIds;
        this.refundAmount = refundAmount;
        this.fullRefund = fullRefund;
    }
}
