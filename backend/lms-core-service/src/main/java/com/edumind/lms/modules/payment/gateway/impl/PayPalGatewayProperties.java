package com.edumind.lms.modules.payment.gateway.impl;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Data
@Component
@ConfigurationProperties(prefix = "payment.paypal")
public class PayPalGatewayProperties {

    private String clientId;
    private String clientSecret;
    private String mode = "sandbox";  // sandbox | live
    private String webhookId;

    public String getBaseUrl() {
        return "sandbox".equals(mode)
                ? "https://api-m.sandbox.paypal.com"
                : "https://api-m.paypal.com";
    }
}
