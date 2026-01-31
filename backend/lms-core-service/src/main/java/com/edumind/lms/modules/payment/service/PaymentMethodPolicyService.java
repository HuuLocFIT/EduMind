package com.edumind.lms.modules.payment.service;

import com.edumind.lms.modules.payment.enums.PaymentMethod;

import java.util.List;

/**
 * Policy service to validate which payment methods are allowed
 * for a given currency and to expose available methods for preview.
 */
public interface PaymentMethodPolicyService {

    /**
     * Validate that the given payment method can be used for the given currency.
     * Should throw a runtime exception if not allowed.
     */
    void validatePaymentMethod(PaymentMethod paymentMethod, String currency);

    /**
     * Return the list of allowed payment methods for the given currency.
     */
    List<PaymentMethod> getAvailableMethods(String currency);
}


