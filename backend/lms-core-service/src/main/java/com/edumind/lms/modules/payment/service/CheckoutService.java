package com.edumind.lms.modules.payment.service;

import com.edumind.lms.modules.payment.dto.request.CheckoutRequest;
import com.edumind.lms.modules.payment.dto.request.DirectCheckoutRequest;
import com.edumind.lms.modules.payment.dto.response.CheckoutPreviewResponse;
import com.edumind.lms.modules.payment.dto.response.CheckoutResultResponse;

/**
 * Main orchestration service for checkout flow.
 * Coordinates Cart, Order, Payment, Enrollment, Earnings, Invoice.
 */
public interface CheckoutService {

    /**
     * Preview checkout (calculate totals, validate items)
     */
    CheckoutPreviewResponse previewCheckout(Long userId);

    /**
     * Process checkout from cart
     */
    CheckoutResultResponse checkout(Long userId, CheckoutRequest request);

    /**
     * Direct checkout for single course (skip cart)
     */
    CheckoutResultResponse directCheckout(Long userId, DirectCheckoutRequest request);

    /**
     * Handle payment gateway callback/webhook
     */
    void handlePaymentCallback(String gatewayTransactionId, String status, String rawPayload);

    /**
     * Retry failed payment for pending order
     */
    CheckoutResultResponse retryPayment(Long userId, Long orderId, CheckoutRequest request);
}
