package com.edumind.lms.modules.payment.controller;

import com.edumind.lms.modules.payment.dto.request.WebhookPayloadRequest;
import com.edumind.lms.modules.payment.enums.PaymentMethod;
import com.edumind.lms.modules.payment.service.WebhookService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Payment Gateway Webhook Controller
 *
 * These endpoints are called by payment gateways to notify
 * about payment status changes (IPN - Instant Payment Notification).
 *
 * IMPORTANT: These endpoints should NOT require authentication
 * as they are called by external services.
 */
@RestController
@RequestMapping("/payments/webhook")
@RequiredArgsConstructor
@Slf4j
public class WebhookController {

    private final WebhookService webhookService;

    // ==================== Mock Gateway (Development) ====================

    /**
     * Mock payment webhook for development/testing
     * POST /payments/webhook/mock
     */
    @PostMapping("/mock")
    public ResponseEntity<Map<String, Object>> handleMockWebhook(
            @RequestBody WebhookPayloadRequest request,
            HttpServletRequest httpRequest) {

        log.info("Received mock webhook: orderNumber={}, status={}",
                request.getOrderNumber(), request.getStatus());

        try {
            webhookService.handleWebhook(PaymentMethod.MOCK, request);

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Webhook processed successfully"
            ));
        } catch (Exception e) {
            log.error("Error processing mock webhook: {}", e.getMessage(), e);

            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", e.getMessage()
            ));
        }
    }

    // ==================== PayPal Gateway ====================

    /**
     * PayPal IPN (Instant Payment Notification) webhook
     * POST /payments/webhook/paypal
     */
    @PostMapping("/paypal")
    public ResponseEntity<String> handlePayPalWebhook(
            @RequestBody WebhookPayloadRequest request,
            @RequestHeader(value = "PAYPAL-TRANSMISSION-ID", required = false) String transmissionId,
            @RequestHeader(value = "PAYPAL-TRANSMISSION-SIG", required = false) String signature,
            HttpServletRequest httpRequest) {

        log.info("Received PayPal webhook: eventType={}, orderNumber={}",
                request.getEventType(), request.getOrderNumber());

        try {
            // Verify webhook signature (production)
            if (!webhookService.verifySignature(PaymentMethod.PAYPAL, request, signature)) {
                log.warn("Invalid PayPal webhook signature");
                return ResponseEntity.badRequest().body("Invalid signature");
            }

            webhookService.handleWebhook(PaymentMethod.PAYPAL, request);

            // PayPal expects HTTP 200 with empty body
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            log.error("Error processing PayPal webhook: {}", e.getMessage(), e);

            // Return 200 to prevent PayPal from retrying
            return ResponseEntity.ok().build();
        }
    }

    // ==================== SePay Gateway (Vietnam) ====================

    /**
     * SePay webhook for QR payment notifications
     * POST /payments/webhook/sepay
     */
    @PostMapping("/sepay")
    public ResponseEntity<Map<String, Object>> handleSepayWebhook(
            @RequestBody WebhookPayloadRequest request,
            @RequestHeader(value = "X-Sepay-Signature", required = false) String signature,
            HttpServletRequest httpRequest) {

        log.info("Received SePay webhook: orderNumber={}, status={}",
                request.getOrderNumber(), request.getStatus());

        try {
            // Verify webhook signature
            if (!webhookService.verifySignature(PaymentMethod.SEPAY, request, signature)) {
                log.warn("Invalid SePay webhook signature");
                return ResponseEntity.badRequest().body(Map.of(
                        "success", false,
                        "error", "Invalid signature"
                ));
            }

            webhookService.handleWebhook(PaymentMethod.SEPAY, request);

            // SePay expects specific response format
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "OK"
            ));
        } catch (Exception e) {
            log.error("Error processing SePay webhook: {}", e.getMessage(), e);

            return ResponseEntity.ok(Map.of(
                    "success", false,
                    "error", e.getMessage()
            ));
        }
    }

    // ==================== Webhook Status Check ====================

    /**
     * Health check for webhook endpoints
     * GET /payments/webhook/health
     */
    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> healthCheck() {
        return ResponseEntity.ok(Map.of(
                "status", "healthy",
                "timestamp", System.currentTimeMillis(),
                "endpoints", Map.of(
                        "mock", "/payments/webhook/mock",
                        "paypal", "/payments/webhook/paypal",
                        "sepay", "/payments/webhook/sepay"
                )
        ));
    }
}