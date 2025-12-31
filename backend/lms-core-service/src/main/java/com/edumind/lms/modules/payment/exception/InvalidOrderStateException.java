package com.edumind.lms.modules.payment.exception;

import com.edumind.common.exception.BadRequestException;
import com.edumind.lms.modules.payment.enums.OrderStatus;

public class InvalidOrderStateException extends BadRequestException {

    public InvalidOrderStateException(String orderNumber, OrderStatus currentStatus, String action) {
        super("Cannot " + action + " order " + orderNumber +
                ". Current status: " + currentStatus);
    }

    public InvalidOrderStateException(String message) {
        super(message);
    }
}
