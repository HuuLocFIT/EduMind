package com.edumind.lms.modules.payment.gateway.impl;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Data
@Component
@ConfigurationProperties(prefix = "payment.sepay")
public class SepayGatewayProperties {

    private String apiKey;
    private String merchantId;
    private String secretKey;
    private String baseUrl = "https://my.sepay.vn";
    private String webhookSecret;

    // Bank account info for QR code generation
    private String bankCode;        // Bank code (e.g., MB, VCB, TCB)
    private String bankAccount;     // Bank account number
    private String accountName;     // Account holder name

    // Optional settings
    private int qrExpireMinutes = 15;  // QR code expiration time
    private String template = "compact2";  // QR template style
}
