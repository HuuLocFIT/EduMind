package com.edumind.lms.modules.payment.service;

import com.edumind.lms.modules.payment.enums.PaymentMethod;
import com.edumind.lms.modules.payment.gateway.PaymentGateway;
import com.edumind.lms.modules.payment.gateway.config.PaymentGatewayRegistry;
import com.edumind.lms.modules.payment.exception.PaymentFailedException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

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

        PaymentGateway gateway = gatewayRegistry.getActiveGateway();

        if (!gateway.supportsCurrency(currency)) {
            log.warn("Payment method {} via gateway {} does not support currency {}",
                    paymentMethod, gateway.getGatewayName(), currency);
            throw new PaymentFailedException(
                    "Selected payment method is not available for currency: " + currency);
        }
    }

    @Override
    public List<PaymentMethod> getAvailableMethods(String currency) {
        PaymentGateway gateway = gatewayRegistry.getActiveGateway();

        if (!gateway.supportsCurrency(currency)) {
            // Only FREE is always allowed regardless of gateway configuration
            return List.of(PaymentMethod.FREE);
        }

        // For now, all non-FREE methods are considered available if the active gateway
        // supports the currency. This can be refined per-gateway in the future.
        return Arrays.stream(PaymentMethod.values())
                .filter(method -> method != PaymentMethod.FREE)
                .collect(Collectors.toList());
    }
}


