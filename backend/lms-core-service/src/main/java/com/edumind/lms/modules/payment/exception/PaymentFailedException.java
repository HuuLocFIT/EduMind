package com.edumind.lms.modules.payment.exception;

import com.edumind.common.exception.BadRequestException;

public class PaymentFailedException extends BadRequestException {

    private final String errorCode;
    private final String gatewayMessage;

    public PaymentFailedException(String message) {
        super(message);
        this.errorCode = null;
        this.gatewayMessage = null;
    }

    public PaymentFailedException(String message, String errorCode, String gatewayMessage) {
        super(message);
        this.errorCode = errorCode;
        this.gatewayMessage = gatewayMessage;
    }

    public String getErrorCode() {
        return errorCode;
    }

    public String getGatewayMessage() {
        return gatewayMessage;
    }
}
