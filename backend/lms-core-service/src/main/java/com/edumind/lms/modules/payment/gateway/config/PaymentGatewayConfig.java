package com.edumind.lms.modules.payment.gateway.config;

import com.edumind.lms.modules.payment.gateway.PaymentGateway;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Configuration for Payment Gateway selection.
 *
 * This config:
 * 1. Collects all PaymentGateway implementations
 * 2. Creates a registry for easy gateway lookup
 * 3. Provides the active gateway based on config
 *
 * Usage:
 * - Inject PaymentGateway directly: Spring will inject the active gateway
 * - Inject PaymentGatewayRegistry to access any gateway by name
 */
@Slf4j
@Configuration
public class PaymentGatewayConfig {

    @Value("${payment.gateway:mock}")
    private String activeGateway;

    /**
     * Registry containing all available payment gateways.
     * Allows looking up gateways by name (MOCK, PAYPAL, SEPAY).
     */
    @Bean
    public PaymentGatewayRegistry paymentGatewayRegistry(List<PaymentGateway> gateways) {
        Map<String, PaymentGateway> gatewayMap = gateways.stream()
                .collect(Collectors.toMap(
                        g -> g.getGatewayName().toUpperCase(),
                        Function.identity()
                ));

        log.info("📦 Payment gateways registered: {}", gatewayMap.keySet());
        log.info("✅ Active gateway: {}", activeGateway.toUpperCase());

        return new PaymentGatewayRegistry(gatewayMap, activeGateway);
    }
}
