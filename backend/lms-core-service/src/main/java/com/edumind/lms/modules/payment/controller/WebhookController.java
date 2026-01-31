package com.edumind.lms.modules.payment.controller;

import com.edumind.lms.modules.payment.dto.request.WebhookPayloadRequest;
import com.edumind.lms.modules.payment.enums.PaymentMethod;
import com.edumind.lms.modules.payment.exception.DuplicateWebhookException;
import com.edumind.lms.modules.payment.gateway.impl.paypal.PayPalWebhookPayload;
import com.edumind.lms.modules.payment.gateway.impl.sepay.SepayWebhookPayload;
import com.edumind.lms.modules.payment.gateway.impl.SepayGatewayProperties;
import com.edumind.lms.modules.payment.service.WebhookService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
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
@Slf4j
public class WebhookController {

    private final WebhookService webhookService;
    private final SepayGatewayProperties sepayProperties;

    @Autowired
    public WebhookController(
            WebhookService webhookService,
            @Autowired(required = false) SepayGatewayProperties sepayProperties) {
        this.webhookService = webhookService;
        this.sepayProperties = sepayProperties;
    }

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
     * PayPal Webhook handler for payment events.
     * POST /payments/webhook/paypal
     *
     * Supported events:
     * - CHECKOUT.ORDER.APPROVED: Order approved by buyer (ready for capture)
     * - PAYMENT.CAPTURE.COMPLETED: Payment captured successfully
     * - PAYMENT.CAPTURE.DENIED: Payment capture was denied
     * - PAYMENT.CAPTURE.REFUNDED: Payment was refunded
     *
     * Reference: https://developer.paypal.com/docs/api/webhooks/v1/
     */
    @PostMapping("/paypal")
    public ResponseEntity<String> handlePayPalWebhook(
            @RequestBody PayPalWebhookPayload payload,
            @RequestHeader(value = "PAYPAL-TRANSMISSION-ID", required = false) String transmissionId,
            @RequestHeader(value = "PAYPAL-TRANSMISSION-TIME", required = false) String transmissionTime,
            @RequestHeader(value = "PAYPAL-TRANSMISSION-SIG", required = false) String signature,
            @RequestHeader(value = "PAYPAL-CERT-URL", required = false) String certUrl,
            @RequestHeader(value = "PAYPAL-AUTH-ALGO", required = false) String authAlgo,
            HttpServletRequest httpRequest) {

        log.info("Received PayPal webhook: id={}, eventType={}, resourceId={}",
                payload.getId(),
                payload.getEventType(),
                payload.getResource() != null ? payload.getResource().getId() : "null");

        try {
            // Convert PayPal payload to our standard format
            WebhookPayloadRequest request = convertPayPalPayload(payload);

            // Verify webhook signature
            if (!webhookService.verifyPayPalSignature(
                    request,
                    transmissionId,
                    transmissionTime,
                    signature,
                    certUrl,
                    authAlgo,
                    httpRequest)) {
                log.warn("Invalid PayPal webhook signature for event: {}", payload.getId());
                return ResponseEntity.badRequest().body("Invalid signature");
            }

            webhookService.handleWebhook(PaymentMethod.PAYPAL, request);

            // PayPal expects HTTP 200 with empty body
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            log.error("Error processing PayPal webhook: {}", e.getMessage(), e);

            // Return 200 to prevent PayPal from retrying indefinitely
            // We've logged the error for investigation
            return ResponseEntity.ok().build();
        }
    }

    /**
     * Convert PayPal webhook payload to standard WebhookPayloadRequest.
     */
    private WebhookPayloadRequest convertPayPalPayload(PayPalWebhookPayload payload) {
        var resource = payload.getResource();
        String eventType = payload.getEventType();

        // Extract order number from custom_id or reference_id
        String orderNumber = null;
        if (resource != null) {
            orderNumber = resource.getCustomId();
        }

        // Map PayPal event type to our status
        String status = mapPayPalEventToStatus(eventType, resource);

        // Extract amount
        BigDecimal amount = BigDecimal.ZERO;
        String currency = "USD";
        if (resource != null && resource.getAmount() != null) {
            amount = resource.getAmount().getValueAsBigDecimal();
            currency = resource.getAmount().getCurrencyCode();
        }

        // Extract transaction ID (capture ID or order ID)
        String transactionId = resource != null ? resource.getId() : null;

        return WebhookPayloadRequest.builder()
                .eventType(eventType)
                .transactionId(transactionId)
                .orderNumber(orderNumber)
                .amount(amount)
                .currency(currency)
                .status(status)
                .rawPayload(payload.getRawWebhookEvent())  // Full webhook event for signature verification
                .build();
    }

    /**
     * Map PayPal event type to our internal status.
     */
    private String mapPayPalEventToStatus(String eventType,
            com.edumind.lms.modules.payment.gateway.impl.paypal.PayPalWebhookResource resource) {
        if (eventType == null) {
            return "UNKNOWN";
        }

        return switch (eventType) {
            case "CHECKOUT.ORDER.APPROVED" -> "APPROVED";
            case "PAYMENT.CAPTURE.COMPLETED" -> "SUCCESS";
            case "PAYMENT.CAPTURE.DENIED" -> "FAILED";
            case "PAYMENT.CAPTURE.REFUNDED" -> "REFUNDED";
            case "PAYMENT.CAPTURE.REVERSED" -> "REFUNDED";
            case "CHECKOUT.ORDER.COMPLETED" -> "SUCCESS";
            default -> {
                // Check resource status as fallback
                if (resource != null && resource.getStatus() != null) {
                    yield resource.getStatus();
                }
                yield "PENDING";
            }
        };
    }

    // ==================== SePay Gateway (Vietnam) ====================

    /**
     * SePay webhook for QR payment notifications (bank transfer detection).
     * POST /payments/webhook/sepay
     *
     * SePay sends webhook when a bank transfer is detected matching our account.
     * Payload contains: id, gateway, transactionDate, accountNumber, code, content,
     * transferType, transferAmount, accumulated, subAccount, referenceCode, description
     *
     * Validates account number, transfer type, and signature before processing.
     */
    @PostMapping("/sepay")
    public ResponseEntity<Map<String, Object>> handleSepayWebhook(
            @RequestBody SepayWebhookPayload sepayPayload,
            @RequestHeader(value = "Authorization", required = false) String authorization,
            HttpServletRequest httpRequest) {

        log.info("Received SePay webhook: id={}, code={}, amount={}, content={}, accountNumber={}",
                sepayPayload.getId(),
                sepayPayload.getCode(),
                sepayPayload.getTransferAmount(),
                sepayPayload.getContent(),
                maskAccountNumber(sepayPayload.getAccountNumber()));

        try {
            // Validate account number matches our configured account
            if (sepayProperties != null && sepayProperties.getBankAccount() != null) {
                if (!sepayProperties.getBankAccount().equals(sepayPayload.getAccountNumber())) {
                    log.error("Account number mismatch in SePay webhook! Expected: {}, Got: {}",
                            maskAccountNumber(sepayProperties.getBankAccount()),
                            maskAccountNumber(sepayPayload.getAccountNumber()));
                    return ResponseEntity.badRequest().body(Map.of(
                            "success", false,
                            "error", "Invalid account number"
                    ));
                }
            } else {
                log.warn("SePay properties not configured - skipping account validation");
            }

            // Only process incoming transfers
            if (!"in".equalsIgnoreCase(sepayPayload.getTransferType())) {
                log.debug("Ignoring non-incoming SePay transfer: type={}", sepayPayload.getTransferType());
                return ResponseEntity.ok(Map.of(
                        "success", true,
                        "message", "Ignored - not an incoming transfer"
                ));
            }

            // Convert SePay payload to our standard format
            WebhookPayloadRequest request = convertSepayPayload(sepayPayload);

            // Verify webhook authorization (SePay sends: "Authorization: Apikey <YOUR_TOKEN>")
            if (!webhookService.verifySignature(PaymentMethod.SEPAY, request, authorization)) {
                log.error("Invalid SePay webhook authorization for transaction: {}", sepayPayload.getId());
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
        } catch (DuplicateWebhookException e) {
            // Duplicate/already processed - return 200 to prevent retry (not an error)
            log.info("SePay webhook already processed: {}", e.getMessage());
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Already processed"
            ));
        } catch (IllegalArgumentException | IllegalStateException e) {
            // Client error (bad data, invalid state) - return 400, don't retry
            log.warn("SePay webhook validation failed: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", e.getMessage()
            ));
        } catch (Exception e) {
            // Server error - return 500 so SePay can retry
            log.error("Error processing SePay webhook: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                    "success", false,
                    "error", "Internal server error"
            ));
        }
    }

    /**
     * Mask account number for logging (show only last 4 digits).
     */
    private String maskAccountNumber(String accountNumber) {
        if (accountNumber == null || accountNumber.length() < 4) {
            return "****";
        }
        return "****" + accountNumber.substring(accountNumber.length() - 4);
    }

    /**
     * Convert SePay webhook payload to standard WebhookPayloadRequest.
     */
    private WebhookPayloadRequest convertSepayPayload(SepayWebhookPayload sepayPayload) {
        // Extract order number from the content or code
        String orderNumber = extractOrderNumber(sepayPayload.getContent(), sepayPayload.getCode());

        // Determine status based on transfer type
        String status = "in".equalsIgnoreCase(sepayPayload.getTransferType()) ? "SUCCESS" : "PENDING";

        return WebhookPayloadRequest.builder()
                .eventType("payment.completed")
                .transactionId(String.valueOf(sepayPayload.getId()))
                .orderNumber(orderNumber)
                .amount(sepayPayload.getTransferAmount() != null
                        ? BigDecimal.valueOf(sepayPayload.getTransferAmount())
                        : BigDecimal.ZERO)
                .currency("VND")
                .status(status)
                .build();
    }

    /**
     * Extract order number from SePay transfer content or code.
     * SePay parses the transfer content and extracts codes automatically.
     */
    private String extractOrderNumber(String content, String code) {
        // First try the code field (SePay extracts this automatically)
        if (code != null && !code.isEmpty()) {
            if (code.toUpperCase().startsWith("ORD")) {
                return code;
            }
            String extracted = findOrderPattern(code);
            if (extracted != null) return extracted;
        }

        // Try to extract from full content
        if (content != null && !content.isEmpty()) {
            return findOrderPattern(content);
        }

        return code; // Return code as fallback
    }

    /**
     * Find order number pattern in text.
     */
    private String findOrderPattern(String text) {
        String upperText = text.toUpperCase();

        // Pattern: ORD-XXXXXX-XXXX or ORDXXXXXXXX
        int ordIndex = upperText.indexOf("ORD");
        if (ordIndex >= 0) {
            int endIndex = ordIndex + 3;
            while (endIndex < upperText.length() &&
                    (Character.isLetterOrDigit(upperText.charAt(endIndex)) ||
                            upperText.charAt(endIndex) == '-')) {
                endIndex++;
            }
            if (endIndex > ordIndex + 3) {
                return text.substring(ordIndex, endIndex);
            }
        }
        return null;
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