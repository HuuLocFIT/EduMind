package com.edumind.lms.modules.payment.gateway.exception;

/**
 * Exception when unable to connect to payment gateway.
 */
public class GatewayConnectionException extends PaymentGatewayException {

    public GatewayConnectionException(String gatewayName, String message) {
        super(gatewayName, "CONNECTION_ERROR", message);
    }

    public GatewayConnectionException(String gatewayName, String message, Throwable cause) {
        super(gatewayName, message, cause);
    }
}
