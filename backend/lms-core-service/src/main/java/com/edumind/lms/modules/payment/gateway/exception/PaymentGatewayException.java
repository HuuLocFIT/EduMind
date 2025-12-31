package com.edumind.lms.modules.payment.gateway.exception;

/**
 * Base exception for payment gateway errors.
 */
public class PaymentGatewayException extends RuntimeException {

    private final String gatewayName;
    private final String errorCode;

    public PaymentGatewayException(String gatewayName, String message) {
        super(message);
        this.gatewayName = gatewayName;
        this.errorCode = "GATEWAY_ERROR";
    }

    public PaymentGatewayException(String gatewayName, String errorCode, String message) {
        super(message);
        this.gatewayName = gatewayName;
        this.errorCode = errorCode;
    }

    public PaymentGatewayException(String gatewayName, String message, Throwable cause) {
        super(message, cause);
        this.gatewayName = gatewayName;
        this.errorCode = "GATEWAY_ERROR";
    }

    public String getGatewayName() {
        return gatewayName;
    }

    public String getErrorCode() {
        return errorCode;
    }
}
