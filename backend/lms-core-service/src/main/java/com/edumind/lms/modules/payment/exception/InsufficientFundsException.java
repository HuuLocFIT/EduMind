package com.edumind.lms.modules.payment.exception;

import com.edumind.common.exception.BadRequestException;

import java.math.BigDecimal;

public class InsufficientFundsException extends BadRequestException {

    public InsufficientFundsException(BigDecimal required, BigDecimal available) {
        super("Insufficient funds. Required: $" + required + ", Available: $" + available);
    }
}
