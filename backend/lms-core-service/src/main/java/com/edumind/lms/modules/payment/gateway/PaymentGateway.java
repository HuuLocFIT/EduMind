package com.edumind.lms.modules.payment.gateway;

import java.math.BigDecimal;

/**
 * Strategy interface for payment gateways.
 * Implementations: MockPaymentGateway, PayPalGateway, SepayGateway
 *
 * Using Strategy Pattern allows:
 * - Easy switching between gateways via configuration
 * - Adding new gateways without modifying existing code
 * - Testing with mock gateway in development
 */
public interface PaymentGateway {

    /**
     * Process a payment request
     * @param request Payment details
     * @return Result containing transaction ID and status
     */
    GatewayPaymentResult processPayment(GatewayPaymentRequest request);

    /**
     * Refund a completed payment
     * @param gatewayTransactionId Original transaction ID from gateway
     * @param amount Amount to refund
     * @param currency Currency code (USD, VND)
     * @return Refund result
     */
    GatewayRefundResult refund(String gatewayTransactionId, BigDecimal amount, String currency);

    /**
     * Check payment status from gateway
     * @param gatewayTransactionId Transaction ID from gateway
     * @return Current status of the payment
     */
    GatewayPaymentStatus getPaymentStatus(String gatewayTransactionId);

    /**
     * Get the gateway name for logging and display
     * @return Gateway name (MOCK, PAYPAL, SEPAY)
     */
    String getGatewayName();

    /**
     * Check if gateway supports the given currency
     * @param currency Currency code
     * @return true if supported
     */
    boolean supportsCurrency(String currency);

    /**
     * Capture a previously authorized payment.
     * Required for two-step payments (like PayPal) where user approves first, then we capture.
     *
     * @param gatewayTransactionId The Order ID from the gateway (returned in processPayment)
     * @return Result of the capture operation
     */
    default GatewayPaymentResult capturePayment(String gatewayTransactionId) {
        throw new UnsupportedOperationException("This gateway does not support manual capture");
    }

    /**
     * Process a payout to an instructor.
     * @param recipient Recipient identifier (PayPal email or bank account)
     * @param amount Amount to payout
     * @param currency Currency code
     * @return Payout result
     */
    default GatewayPayoutResult payout(String recipient, BigDecimal amount, String currency) {
        throw new UnsupportedOperationException("This gateway does not support payouts");
    }
}
