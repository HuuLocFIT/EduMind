package com.edumind.lms.modules.payment.service;

import com.edumind.lms.modules.payment.enums.PaymentMethod;
import com.edumind.lms.modules.payment.gateway.PaymentGateway;
import com.edumind.lms.modules.payment.gateway.config.PaymentGatewayRegistry;
import com.edumind.lms.modules.payment.exception.PaymentFailedException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class PaymentMethodPolicyServiceImpl implements PaymentMethodPolicyService {

    private final PaymentGatewayRegistry gatewayRegistry;

    @Override
    public void validatePaymentMethod(PaymentMethod paymentMethod, String currency) {
        // FREE orders are handled separately and never reach the gateway
        if (paymentMethod == PaymentMethod.FREE) {
            return;
        }

        // Get the gateway for this specific payment method
        String gatewayName = getGatewayNameForMethod(paymentMethod);
        PaymentGateway gateway = gatewayRegistry.getGateway(gatewayName).orElse(null);

        if (gateway == null) {
            log.warn("Gateway {} for payment method {} is not available",
                    gatewayName, paymentMethod);
            throw new PaymentFailedException(
                    "Selected payment method is not available. Please choose another payment method.");
        }

        if (!gateway.supportsCurrency(currency)) {
            log.warn("Payment method {} via gateway {} does not support currency {}",
                    paymentMethod, gateway.getGatewayName(), currency);
            throw new PaymentFailedException(
                    "Selected payment method is not available for currency: " + currency);
        }
    }

    @Override
    public List<PaymentMethod> getAvailableMethods(String currency) {
        List<PaymentMethod> availableMethods = new ArrayList<>();

        // Always include FREE for free courses
        availableMethods.add(PaymentMethod.FREE);

        // Check each payment method's gateway availability and currency support
        checkAndAddMethod(availableMethods, PaymentMethod.PAYPAL, "PAYPAL", currency);
        checkAndAddMethod(availableMethods, PaymentMethod.SEPAY, "SEPAY", currency);
        checkAndAddMethod(availableMethods, PaymentMethod.MOCK, "MOCK", currency);

        return availableMethods;
    }

    /**
     * Check if a payment method's gateway is available and supports the currency.
     */
    private void checkAndAddMethod(List<PaymentMethod> methods, PaymentMethod method,
                                   String gatewayName, String currency) {
        gatewayRegistry.getGateway(gatewayName).ifPresent(gateway -> {
            if (gateway.supportsCurrency(currency)) {
                methods.add(method);
                log.debug("Payment method {} available for currency {}", method, currency);
            }
        });
    }

    /**
     * Map payment method to gateway name.
     */
    private String getGatewayNameForMethod(PaymentMethod method) {
        return switch (method) {
            case PAYPAL -> "PAYPAL";
            case SEPAY -> "SEPAY";
            case MOCK -> "MOCK";
            case FREE -> "MOCK"; // Fallback, not actually used for FREE
        };
    }
}
