package com.edumind.lms.modules.payment.event;

import com.edumind.lms.shared.event.DomainEvent;
import lombok.Getter;

@Getter
public class OrderCancelledEvent extends DomainEvent {
    private final Long orderId;
    private final String orderNumber;
    private final Long userId;

    public OrderCancelledEvent(Object source, Long orderId, String orderNumber, Long userId) {
        super(source);
        this.orderId = orderId;
        this.orderNumber = orderNumber;
        this.userId = userId;
    }
}
