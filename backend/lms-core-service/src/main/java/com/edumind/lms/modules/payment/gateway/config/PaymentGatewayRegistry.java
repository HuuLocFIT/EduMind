package com.edumind.lms.modules.payment.gateway.config;

import com.edumind.lms.modules.payment.gateway.PaymentGateway;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

import java.util.Map;
import java.util.Optional;
import java.util.Set;

/**
 * Registry for payment gateways.
 * Provides access to all registered gateways and the active gateway.
 */
@RequiredArgsConstructor
public class PaymentGatewayRegistry {

    private final Map<String, PaymentGateway> gateways;

    @Getter
    private final String activeGatewayName;

    /**
     * Get the currently active payment gateway.
     */
    public PaymentGateway getActiveGateway() {
        return getGateway(activeGatewayName)
                .orElseThrow(() -> new IllegalStateException(
                        "Active gateway not found: " + activeGatewayName
                ));
    }

    /**
     * Get a specific gateway by name.
     */
    public Optional<PaymentGateway> getGateway(String name) {
        return Optional.ofNullable(gateways.get(name.toUpperCase()));
    }

    /**
     * Get all registered gateway names.
     */
    public Set<String> getAvailableGateways() {
        return gateways.keySet();
    }

    /**
     * Check if a gateway is available.
     */
    public boolean isGatewayAvailable(String name) {
        return gateways.containsKey(name.toUpperCase());
    }
}
