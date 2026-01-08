package com.edumind.lms.modules.payment.service;

import com.edumind.lms.modules.payment.dto.request.WebhookPayloadRequest;
import com.edumind.lms.modules.payment.enums.PaymentMethod;

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
     * Verify webhook signature
     *
     * @param gateway The payment gateway type
     * @param request The webhook payload
     * @param signature The signature from request header
     * @return true if signature is valid
     */
    boolean verifySignature(PaymentMethod gateway, WebhookPayloadRequest request, String signature);
}
