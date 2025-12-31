package com.edumind.lms.modules.payment.exception;

import com.edumind.common.exception.BadRequestException;

public class CartEmptyException extends BadRequestException {

    public CartEmptyException() {
        super("Your cart is empty. Please add courses before checkout.");
    }

    public CartEmptyException(String message) {
        super(message);
    }
}
