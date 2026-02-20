package com.edumind.lms.modules.payment.event;

import lombok.Getter;

import com.edumind.lms.shared.event.DomainEvent;

@Getter
public class PaymentFailedEvent extends DomainEvent {
    private final Long orderId;
    private final String orderNumber;
    private final Long userId;
    private final String errorMessage;

    public PaymentFailedEvent(Object source, Long orderId, String orderNumber, Long userId, String errorMessage) {
        super(source);
        this.orderId = orderId;
        this.orderNumber = orderNumber;
        this.userId = userId;
        this.errorMessage = errorMessage;
    }
}

