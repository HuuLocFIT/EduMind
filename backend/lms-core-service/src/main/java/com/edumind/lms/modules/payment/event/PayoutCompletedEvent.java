package com.edumind.lms.modules.payment.event;

import com.edumind.lms.shared.event.DomainEvent;
import lombok.Getter;

import java.math.BigDecimal;

@Getter
public class PayoutCompletedEvent extends DomainEvent {
    private final Long payoutId;
    private final String payoutNumber;
    private final Long instructorId;
    private final BigDecimal totalAmount;
    private final String currency;

    public PayoutCompletedEvent(
            Object source,
            Long payoutId,
            String payoutNumber,
            Long instructorId,
            BigDecimal totalAmount,
            String currency
    ) {
        super(source);
        this.payoutId = payoutId;
        this.payoutNumber = payoutNumber;
        this.instructorId = instructorId;
        this.totalAmount = totalAmount;
        this.currency = currency;
    }
}
