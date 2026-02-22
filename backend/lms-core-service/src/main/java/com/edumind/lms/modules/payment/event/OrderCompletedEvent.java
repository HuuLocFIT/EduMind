package com.edumind.lms.modules.payment.event;

import lombok.Getter;

import com.edumind.lms.shared.event.DomainEvent;

import java.math.BigDecimal;
import java.util.List;

@Getter
public class OrderCompletedEvent extends DomainEvent {
    private final Long orderId;
    private final String orderNumber;
    private final Long userId;
    private final List<OrderItemInfo> items;
    private final BigDecimal totalAmount;
    private final String currency;
    private final boolean freeOrder;

    public OrderCompletedEvent(
            Object source,
            Long orderId,
            String orderNumber,
            Long userId,
            List<OrderItemInfo> items,
            BigDecimal totalAmount,
            String currency,
            boolean freeOrder
    ) {
        super(source);
        this.orderId = orderId;
        this.orderNumber = orderNumber;
        this.userId = userId;
        this.items = items;
        this.totalAmount = totalAmount;
        this.currency = currency;
        this.freeOrder = freeOrder;
    }

    public record OrderItemInfo(
            Long courseId,
            String courseTitle,
            Long instructorId,
            BigDecimal finalPrice
    ) {
    }
}

