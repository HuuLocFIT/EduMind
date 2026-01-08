package com.edumind.lms.modules.payment.gateway.exception;

/**
 * Exception when gateway returns invalid/unexpected response.
 */
public class InvalidGatewayResponseException extends PaymentGatewayException {

    private final String rawResponse;

    public InvalidGatewayResponseException(String gatewayName, String message, String rawResponse) {
        super(gatewayName, "INVALID_RESPONSE", message);
        this.rawResponse = rawResponse;
    }

    public String getRawResponse() {
        return rawResponse;
    }
}
