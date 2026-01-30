package com.edumind.lms.modules.payment.service;

import com.edumind.lms.modules.payment.dto.request.WebhookPayloadRequest;
import com.edumind.lms.modules.payment.enums.PaymentMethod;
import jakarta.servlet.http.HttpServletRequest;

/**
 * Service to handle payment gateway webhook callbacks.
 */
public interface WebhookService {

    /**
     * Handle webhook from any payment gateway
     *
     * @param gateway The payment gateway type
     * @param request The webhook payload
     */
    void handleWebhook(PaymentMethod gateway, WebhookPayloadRequest request);

    /**
     * Verify webhook signature (generic)
     *
     * @param gateway The payment gateway type
     * @param request The webhook payload
     * @param signature The signature from request header
     * @return true if signature is valid
     */
    boolean verifySignature(PaymentMethod gateway, WebhookPayloadRequest request, String signature);

    /**
     * Verify PayPal webhook signature using PayPal's verification API.
     *
     * @param request The converted webhook payload
     * @param transmissionId PayPal transmission ID header
     * @param transmissionTime PayPal transmission time header
     * @param signature PayPal signature header
     * @param certUrl PayPal certificate URL header
     * @param authAlgo PayPal auth algorithm header
     * @param httpRequest The original HTTP request (for raw body access if needed)
     * @return true if signature is valid
     */
    boolean verifyPayPalSignature(
            WebhookPayloadRequest request,
            String transmissionId,
            String transmissionTime,
            String signature,
            String certUrl,
            String authAlgo,
            HttpServletRequest httpRequest);
}
