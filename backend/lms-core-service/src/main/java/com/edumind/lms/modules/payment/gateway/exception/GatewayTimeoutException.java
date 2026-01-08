package com.edumind.lms.modules.payment.gateway.exception;

/**
 * Exception when payment gateway request times out.
 */
public class GatewayTimeoutException extends PaymentGatewayException {

    public GatewayTimeoutException(String gatewayName, String message) {
        super(gatewayName, "TIMEOUT", message);
    }
}