package com.edumind.lms.modules.payment.event;

import com.edumind.lms.modules.payment.entity.Order;
import lombok.Getter;
import org.springframework.context.ApplicationEvent;

@Getter
public class PaymentFailedEvent extends ApplicationEvent {
    private final Order order;
    private final String errorMessage;

    public PaymentFailedEvent(Object source, Order order, String errorMessage) {
        super(source);
        this.order = order;
        this.errorMessage = errorMessage;
    }
}

