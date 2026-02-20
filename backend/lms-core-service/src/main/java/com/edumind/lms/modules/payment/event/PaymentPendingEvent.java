package com.edumind.lms.modules.payment.event;

import com.edumind.lms.shared.event.DomainEvent;
import lombok.Getter;

/**
 * Published when a payment enters PENDING state.
 * Enables audit logging and downstream notification consistency
 * (analogous to PaymentFailedEvent).
 */
@Getter
public class PaymentPendingEvent extends DomainEvent {
    private final Long orderId;
    private final String orderNumber;
    private final Long userId;

    public PaymentPendingEvent(
            Object source,
            Long orderId,
            String orderNumber,
            Long userId
    ) {
        super(source);
        this.orderId = orderId;
        this.orderNumber = orderNumber;
        this.userId = userId;
    }
}
