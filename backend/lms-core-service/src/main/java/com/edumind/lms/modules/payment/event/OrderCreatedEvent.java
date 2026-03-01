package com.edumind.lms.modules.payment.event;

import com.edumind.lms.shared.event.DomainEvent;
import lombok.Getter;

import java.math.BigDecimal;

@Getter
public class OrderCreatedEvent extends DomainEvent {
    private final Long orderId;
    private final String orderNumber;
    private final Long userId;
    private final BigDecimal totalAmount;
    private final String currency;

    public OrderCreatedEvent(
            Object source,
            Long orderId,
            String orderNumber,
            Long userId,
            BigDecimal totalAmount,
            String currency
    ) {
        super(source);
        this.orderId = orderId;
        this.orderNumber = orderNumber;
        this.userId = userId;
        this.totalAmount = totalAmount;
        this.currency = currency;
    }
}
