package com.edumind.lms.modules.payment.gateway.exception;

/**
 * Exception when currency is not supported by gateway.
 */
public class UnsupportedCurrencyException extends PaymentGatewayException {

    private final String currency;

    public UnsupportedCurrencyException(String gatewayName, String currency) {
        super(gatewayName, "UNSUPPORTED_CURRENCY",
                String.format("Currency %s is not supported by %s", currency, gatewayName));
        this.currency = currency;
    }

    public String getCurrency() {
        return currency;
    }
}
