package com.edumind.lms.modules.payment.gateway.impl.paypal;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

import java.math.BigDecimal;

/**
 * PayPal Amount object.
 */
@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class PayPalAmount {

    @JsonProperty("currency_code")
    private String currencyCode;

    private String value;

    public BigDecimal getValueAsBigDecimal() {
        if (value == null || value.isEmpty()) {
            return BigDecimal.ZERO;
        }
        return new BigDecimal(value);
    }
}
