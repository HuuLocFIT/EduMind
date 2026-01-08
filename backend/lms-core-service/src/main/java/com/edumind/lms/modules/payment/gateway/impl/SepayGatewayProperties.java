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
}
