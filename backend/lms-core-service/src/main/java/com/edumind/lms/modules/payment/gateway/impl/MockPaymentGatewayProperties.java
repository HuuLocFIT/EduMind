package com.edumind.lms.modules.payment.gateway.impl;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Configuration properties for Mock Payment Gateway.
 *
 * application.yml:
 * payment:
 *   mock:
 *     delay-ms: 1500
 *     success-rate: 0.95
 */
@Data
@Component
@ConfigurationProperties(prefix = "payment.mock")
public class MockPaymentGatewayProperties {

    /**
     * Simulated processing delay in milliseconds.
     * Default: 1500ms (1.5 seconds)
     */
    private long delayMs = 1500;

    /**
     * Success rate for random card numbers (0.0 - 1.0).
     * Default: 0.95 (95% success rate)
     */
    private double successRate = 0.95;

    /**
     * Whether mock gateway is enabled.
     * Default: true
     */
    private boolean enabled = true;
}
