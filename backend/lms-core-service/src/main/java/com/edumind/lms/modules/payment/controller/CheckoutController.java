package com.edumind.lms.modules.payment.controller;

import com.edumind.common.response.ApiResponse;
import com.edumind.lms.modules.payment.dto.request.CheckoutRequest;
import com.edumind.lms.modules.payment.dto.request.DirectCheckoutRequest;
import com.edumind.lms.modules.payment.dto.response.CheckoutPreviewResponse;
import com.edumind.lms.modules.payment.dto.response.CheckoutResultResponse;
import com.edumind.lms.modules.payment.service.CheckoutService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

@RestController
@RequestMapping("/checkout")
@RequiredArgsConstructor
@Slf4j
@PreAuthorize("@teacherSecurity.isActiveTeacherOrStudent(authentication.principal.userId)")
public class CheckoutController {

    private final CheckoutService checkoutService;

    // ==================== Cart Checkout ====================

    /**
     * Preview checkout before payment
     * Shows order summary, totals, and validates cart items
     * POST /checkout/preview
     */
    @PostMapping("/preview")
    public ResponseEntity<ApiResponse<CheckoutPreviewResponse>> previewCheckout(
            Authentication authentication) {

        Long userId = extractUserId(authentication);
        log.info("User {} requesting checkout preview", userId);

        CheckoutPreviewResponse preview = checkoutService.previewCheckout(userId);

        return ResponseEntity.ok(ApiResponse.success(preview));
    }

    /**
     * Process checkout for all items in cart
     * POST /checkout
     */
    @PostMapping
    public ResponseEntity<ApiResponse<CheckoutResultResponse>> checkout(
            @Valid @RequestBody CheckoutRequest request,
            Authentication authentication) {

        Long userId = extractUserId(authentication);
        log.info("User {} processing checkout with method {}", userId, request.getPaymentMethod());

        // Capture IP and user agent for fraud detection
        enrichRequestMetadata(request);

        CheckoutResultResponse result = checkoutService.checkout(userId, request);

        String message = result.isSuccess()
                ? "Payment processed successfully"
                : "Payment processing failed";

        return ResponseEntity.ok(ApiResponse.success(message, result));
    }

    /**
     * Capture payment (e.g. for PayPal after approval)
     * POST /checkout/capture?token=...
     */
    @PostMapping("/capture")
    public ResponseEntity<ApiResponse<CheckoutResultResponse>> capturePayment(
            @RequestParam("token") String token,
            Authentication authentication) {

        Long userId = extractUserId(authentication);
        log.info("User {} capturing payment for token {}", userId, token);

        CheckoutResultResponse result = checkoutService.capturePayment(userId, token);

        String message = result.isSuccess()
                ? "Payment captured successfully"
                : "Payment capture failed";

        return ResponseEntity.ok(ApiResponse.success(message, result));
    }

    /**
     * Handle payment cancellation (e.g. user cancelled on PayPal)
     * POST /checkout/cancel?orderId=...
     *
     * This endpoint is called when user cancels payment on the gateway page.
     * The order remains in PENDING/PROCESSING state and can be retried.
     */
    @PostMapping("/cancel")
    public ResponseEntity<ApiResponse<CheckoutResultResponse>> handleCancellation(
            @RequestParam("orderId") Long orderId,
            Authentication authentication) {

        Long userId = extractUserId(authentication);
        log.info("User {} cancelled payment for order {}", userId, orderId);

        CheckoutResultResponse result = checkoutService.handlePaymentCancellation(userId, orderId);

        return ResponseEntity.ok(ApiResponse.success("Payment cancelled. You can retry or choose a different payment method.", result));
    }

    /**
     * Check payment status for an order (polling endpoint for SePay QR payments)
     * GET /checkout/status/{orderId}
     *
     * Frontend should poll this endpoint after displaying QR code to check
     * if the payment has been confirmed via webhook.
     */
    @GetMapping("/status/{orderId}")
    public ResponseEntity<ApiResponse<CheckoutResultResponse>> checkPaymentStatus(
            @PathVariable("orderId") Long orderId,
            Authentication authentication) {

        Long userId = extractUserId(authentication);
        log.debug("User {} checking payment status for order {}", userId, orderId);

        CheckoutResultResponse result = checkoutService.getOrderStatus(userId, orderId);

        String message = result.isSuccess()
                ? "Payment confirmed"
                : result.isPending()
                        ? "Waiting for payment confirmation"
                        : "Payment failed";

        return ResponseEntity.ok(ApiResponse.success(message, result));
    }

    // ==================== Direct Checkout (Buy Now) ====================

    /**
     * Preview direct checkout for a single course
     * POST /checkout/direct/preview
     */
    @PostMapping("/direct/preview")
    public ResponseEntity<ApiResponse<CheckoutPreviewResponse>> previewDirectCheckout(
            @RequestParam Long courseId,
            Authentication authentication) {

        Long userId = extractUserId(authentication);
        log.info("User {} requesting direct checkout preview for course {}", userId, courseId);

        CheckoutPreviewResponse preview = checkoutService.previewDirectCheckout(userId, courseId);

        return ResponseEntity.ok(ApiResponse.success(preview));
    }

    /**
     * Process direct checkout for a single course (Buy Now)
     * Bypasses cart - purchases single course immediately
     * POST /checkout/direct
     */
    @PostMapping("/direct")
    public ResponseEntity<ApiResponse<CheckoutResultResponse>> directCheckout(
            @Valid @RequestBody DirectCheckoutRequest request,
            Authentication authentication) {

        Long userId = extractUserId(authentication);
        log.info("User {} processing direct checkout for course {} with method {}",
                userId, request.getCourseId(), request.getPaymentMethod());

        // Capture IP and user agent for fraud detection
        enrichRequestMetadata(request);

        CheckoutResultResponse result = checkoutService.directCheckout(userId, request);

        String message = result.isSuccess()
                ? "Course purchased successfully"
                : "Purchase failed";

        return ResponseEntity.ok(ApiResponse.success(message, result));
    }

    // ==================== Helper Methods ====================

    private Long extractUserId(Authentication authentication) {
        return Long.valueOf(authentication.getPrincipal().toString());
    }

    private void enrichRequestMetadata(CheckoutRequest request) {
        HttpServletRequest httpRequest = getHttpServletRequest();
        if (httpRequest != null) {
            if (request.getIpAddress() == null) {
                request.setIpAddress(getClientIp(httpRequest));
            }
            if (request.getUserAgent() == null) {
                request.setUserAgent(httpRequest.getHeader("User-Agent"));
            }
        }
    }

    private void enrichRequestMetadata(DirectCheckoutRequest request) {
        HttpServletRequest httpRequest = getHttpServletRequest();
        if (httpRequest != null) {
            if (request.getIpAddress() == null) {
                request.setIpAddress(getClientIp(httpRequest));
            }
            if (request.getUserAgent() == null) {
                request.setUserAgent(httpRequest.getHeader("User-Agent"));
            }
        }
    }

    private HttpServletRequest getHttpServletRequest() {
        ServletRequestAttributes attributes = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
        return attributes != null ? attributes.getRequest() : null;
    }

    private String getClientIp(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isEmpty()) {
            return xForwardedFor.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}