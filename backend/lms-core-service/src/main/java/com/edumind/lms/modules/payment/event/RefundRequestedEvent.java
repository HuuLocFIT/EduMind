package com.edumind.lms.modules.payment.event;

import com.edumind.lms.shared.event.DomainEvent;
import lombok.Getter;

import java.math.BigDecimal;

@Getter
public class RefundRequestedEvent extends DomainEvent {
    private final Long refundRequestId;
    private final Long orderId;
    private final String orderNumber;
    private final Long userId;
    private final BigDecimal requestedAmount;
    private final String currency;

    public RefundRequestedEvent(
            Object source,
            Long refundRequestId,
            Long orderId,
            String orderNumber,
            Long userId,
            BigDecimal requestedAmount,
            String currency
    ) {
        super(source);
        this.refundRequestId = refundRequestId;
        this.orderId = orderId;
        this.orderNumber = orderNumber;
        this.userId = userId;
        this.requestedAmount = requestedAmount;
        this.currency = currency;
    }
}
