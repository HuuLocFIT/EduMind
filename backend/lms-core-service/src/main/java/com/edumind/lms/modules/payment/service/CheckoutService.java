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
     * Preview direct checkout (buy now)
     */
    CheckoutPreviewResponse previewDirectCheckout(Long userId, Long courseId);

    /**
     * Handle payment gateway callback/webhook
     */
    void handlePaymentCallback(String gatewayTransactionId, String status, String rawPayload);

    /**
     * Retry failed payment for pending order
     */
    CheckoutResultResponse retryPayment(Long userId, Long orderId, CheckoutRequest request);

    /**
     * Capture a pending payment (e.g. PayPal after user approval)
     */
    CheckoutResultResponse capturePayment(Long userId, String gatewayOrderId);

    /**
     * Handle payment cancellation (e.g. user cancelled on PayPal page)
     * Returns order info so user can retry with same or different payment method
     */
    CheckoutResultResponse handlePaymentCancellation(Long userId, Long orderId);
}
