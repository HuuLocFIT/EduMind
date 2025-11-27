package com.edumind.lms.shared.event.payment;

import com.edumind.lms.shared.event.DomainEvent;
import lombok.Getter;

import java.math.BigDecimal;

@Getter
public class PaymentSuccessEvent extends DomainEvent {
    private final Long paymentId;
    private final Long userId;
    private final Long courseId;
    private final BigDecimal amount;

    public PaymentSuccessEvent(Object source, Long paymentId, Long userId, Long courseId, BigDecimal amount) {
        super(source);
        this.paymentId = paymentId;
        this.userId = userId;
        this.courseId = courseId;
        this.amount = amount;
    }
}
