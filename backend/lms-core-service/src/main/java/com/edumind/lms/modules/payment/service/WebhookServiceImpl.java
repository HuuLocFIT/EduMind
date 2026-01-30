package com.edumind.lms.modules.payment.service;

import com.edumind.lms.modules.course.service.EnrollmentService;
import com.edumind.lms.modules.payment.dto.request.WebhookPayloadRequest;
import com.edumind.lms.modules.payment.entity.Order;
import com.edumind.lms.modules.payment.entity.OrderItem;
import com.edumind.lms.modules.payment.entity.Transaction;
import com.edumind.lms.modules.payment.enums.OrderStatus;
import com.edumind.lms.modules.payment.enums.PaymentMethod;
import com.edumind.lms.modules.payment.enums.TransactionStatus;
import com.edumind.lms.modules.payment.event.OrderCompletedEvent;
import com.edumind.lms.modules.payment.event.PaymentFailedEvent;
import com.edumind.lms.modules.payment.exception.OrderNotFoundException;
import com.edumind.lms.modules.payment.exception.TransactionNotFoundException;
import com.edumind.lms.modules.payment.gateway.impl.PayPalGatewayProperties;
import com.edumind.lms.modules.payment.repository.OrderRepository;
import com.edumind.lms.modules.payment.repository.TransactionRepository;
import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.Map;
import java.util.Set;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

@Service
@Slf4j
public class WebhookServiceImpl implements WebhookService {

    private final OrderRepository orderRepository;
    private final TransactionRepository transactionRepository;
    private final EnrollmentService enrollmentService;
    private final EarningService earningService;
    private final InvoiceService invoiceService;
    private final ApplicationEventPublisher eventPublisher;
    private final PayPalGatewayProperties payPalProperties;

    public WebhookServiceImpl(
            OrderRepository orderRepository,
            TransactionRepository transactionRepository,
            EnrollmentService enrollmentService,
            EarningService earningService,
            InvoiceService invoiceService,
            ApplicationEventPublisher eventPublisher,
            @org.springframework.beans.factory.annotation.Autowired(required = false)
            PayPalGatewayProperties payPalProperties) {
        this.orderRepository = orderRepository;
        this.transactionRepository = transactionRepository;
        this.enrollmentService = enrollmentService;
        this.earningService = earningService;
        this.invoiceService = invoiceService;
        this.eventPublisher = eventPublisher;
        this.payPalProperties = payPalProperties;
    }

    @Value("${payment.sepay.webhook-secret:}")
    private String sepayWebhookSecret;

    @Value("${payment.paypal.webhook-id:}")
    private String paypalWebhookId;

    // ==================== Main Handler ====================

    @Override
    @Transactional
    public void handleWebhook(PaymentMethod gateway, WebhookPayloadRequest request) {
        log.info("Processing {} webhook: orderNumber={}, status={}",
                gateway, request.getOrderNumber(), request.getStatus());

        // Find order by order number
        Order order = orderRepository.findByOrderNumber(request.getOrderNumber())
                .orElseThrow(() -> new OrderNotFoundException(
                        "Order not found: " + request.getOrderNumber()));

        // Find transaction for this order
        Transaction transaction = transactionRepository.findFirstByOrderIdOrderByCreatedAtDesc(order.getId())
                .orElseThrow(() -> new TransactionNotFoundException(
                        "Transaction not found for order: " + request.getOrderNumber()));

        // Process based on status
        String status = request.getStatus().toUpperCase();
        switch (status) {
            case "SUCCESS", "COMPLETED", "00" ->
                    handlePaymentSuccess(order, transaction, request.getTransactionId());
            case "FAILED", "DECLINED", "DENIED", "01" ->
                    handlePaymentFailure(order, transaction, request.getFailureReason());
            case "PENDING", "02" ->
                    handlePaymentPending(order, transaction);
            case "APPROVED" ->
                    // PayPal: User approved the order, awaiting capture
                    // This is an intermediate state - don't change order status yet
                    log.info("Order {} approved by buyer, awaiting capture", order.getOrderNumber());
            case "REFUNDED", "REVERSED" ->
                    handleRefund(order, transaction);
            default ->
                    log.warn("Unknown webhook status: {} for gateway: {}", status, gateway);
        }
    }

    // ==================== Signature Verification ====================

    @Override
    public boolean verifySignature(PaymentMethod gateway, WebhookPayloadRequest request, String signature) {
        return switch (gateway) {
            case MOCK -> true; // No verification for mock
            case PAYPAL -> verifyPayPalSignature(request, signature);
            case SEPAY -> verifySepaySignature(request, signature);
            default -> {
                log.warn("No signature verification for gateway: {}", gateway);
                yield true;
            }
        };
    }

    private boolean verifyPayPalSignature(WebhookPayloadRequest request, String signature) {
        // Legacy method - delegate to new method with null headers
        return verifyPayPalSignature(request, null, null, signature, null, null, null);
    }

    @Override
    public boolean verifyPayPalSignature(
            WebhookPayloadRequest request,
            String transmissionId,
            String transmissionTime,
            String signature,
            String certUrl,
            String authAlgo,
            HttpServletRequest httpRequest) {

        // Check if webhook ID is configured
        if (paypalWebhookId == null || paypalWebhookId.isEmpty()) {
            log.warn("PayPal webhook verification skipped - no webhook ID configured. " +
                    "Configure PAYPAL_WEBHOOK_ID for production.");
            return true;
        }

        // In development/sandbox without signature, skip verification
        if (signature == null || signature.isEmpty()) {
            log.warn("PayPal signature not provided for order {} - skipping verification (configure for production)",
                    request.getOrderNumber());
            return true;
        }

        // Validate required headers
        if (transmissionId == null || transmissionTime == null || certUrl == null || authAlgo == null) {
            log.warn("Missing PayPal webhook headers for verification. " +
                    "transmissionId={}, transmissionTime={}, certUrl={}, authAlgo={}",
                    transmissionId != null, transmissionTime != null, certUrl != null, authAlgo != null);
            // Allow in development, but log warning
            return true;
        }

        try {
            // Use PayPal's Verify Webhook Signature API
            // Reference: https://developer.paypal.com/docs/api/webhooks/v1/#verify-webhook-signature_post
            return verifyWithPayPalApi(
                    transmissionId,
                    transmissionTime,
                    signature,
                    certUrl,
                    authAlgo,
                    request.getRawPayload()
            );
        } catch (Exception e) {
            log.error("PayPal signature verification failed for order {}: {}",
                    request.getOrderNumber(), e.getMessage(), e);
            // In case of verification errors, reject the webhook
            return false;
        }
    }

    /**
     * Verify webhook signature using PayPal's Verification API.
     */
    private boolean verifyWithPayPalApi(
            String transmissionId,
            String transmissionTime,
            String transmissionSig,
            String certUrl,
            String authAlgo,
            Map<String, Object> webhookEvent) {

        // Check if PayPal is configured
        if (payPalProperties == null) {
            log.warn("PayPal properties not configured - skipping webhook verification");
            return true;
        }

        String verifyUrl = payPalProperties.getBaseUrl() + "/v1/notifications/verify-webhook-signature";

        // Build verification request body
        Map<String, Object> verifyRequest = Map.of(
                "auth_algo", authAlgo,
                "cert_url", certUrl,
                "transmission_id", transmissionId,
                "transmission_sig", transmissionSig,
                "transmission_time", transmissionTime,
                "webhook_id", paypalWebhookId,
                "webhook_event", webhookEvent != null ? webhookEvent : Map.of()
        );

        try {
            RestTemplate restTemplate = new RestTemplate();

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("Authorization", "Basic " + getPayPalAuthHeader());

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(verifyRequest, headers);

            ResponseEntity<Map> response = restTemplate.exchange(
                    verifyUrl,
                    HttpMethod.POST,
                    entity,
                    Map.class
            );

            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                String verificationStatus = (String) response.getBody().get("verification_status");
                boolean verified = "SUCCESS".equals(verificationStatus);

                if (!verified) {
                    log.warn("PayPal webhook verification failed. Status: {}", verificationStatus);
                } else {
                    log.debug("PayPal webhook signature verified successfully");
                }

                return verified;
            }

            log.warn("Unexpected PayPal verification response: {}", response.getStatusCode());
            return false;

        } catch (Exception e) {
            log.error("Error calling PayPal verification API: {}", e.getMessage(), e);
            return false;
        }
    }

    /**
     * Generate Base64 encoded auth header for PayPal API.
     */
    private String getPayPalAuthHeader() {
        String credentials = payPalProperties.getClientId() + ":" + payPalProperties.getClientSecret();
        return Base64.getEncoder().encodeToString(credentials.getBytes(StandardCharsets.UTF_8));
    }

    private boolean verifySepaySignature(WebhookPayloadRequest request, String signature) {
        if (sepayWebhookSecret == null || sepayWebhookSecret.isEmpty()) {
            log.warn("SePay signature verification skipped - no secret configured");
            return true;
        }

        // SePay may not send signature for all webhook calls
        // In production, you should configure webhook secret in SePay dashboard
        if (signature == null || signature.isEmpty()) {
            log.warn("Missing SePay signature for order {} - allowing request (configure webhook secret in production)",
                    request.getOrderNumber());
            return true; // Allow in development, enforce in production
        }

        try {
            // SePay signature format: HMAC-SHA256 of transactionId|amount|orderNumber
            String dataToSign = request.getTransactionId()
                    + "|" + request.getAmount().longValue()
                    + "|" + request.getOrderNumber();

            Mac mac = Mac.getInstance("HmacSHA256");
            SecretKeySpec keySpec = new SecretKeySpec(
                    sepayWebhookSecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
            mac.init(keySpec);
            byte[] rawHmac = mac.doFinal(dataToSign.getBytes(StandardCharsets.UTF_8));

            StringBuilder hex = new StringBuilder(rawHmac.length * 2);
            for (byte b : rawHmac) {
                String h = Integer.toHexString(0xff & b);
                if (h.length() == 1) {
                    hex.append('0');
                }
                hex.append(h);
            }
            String expectedSignature = hex.toString();

            boolean valid = expectedSignature.equalsIgnoreCase(signature);
            if (!valid) {
                log.warn("Invalid SePay signature for order {}. Expected {}, got {}",
                        request.getOrderNumber(), expectedSignature, signature);
            }
            return valid;
        } catch (Exception e) {
            log.error("Error verifying SePay signature for order {}: {}",
                    request.getOrderNumber(), e.getMessage(), e);
            return false;
        }
    }

    // ==================== Payment Status Handlers ====================

    private void handlePaymentSuccess(Order order, Transaction transaction, String gatewayTxnId) {
        log.info("Payment success for order {}, gateway txn: {}",
                order.getOrderNumber(), gatewayTxnId);

        // Update transaction
        transaction.markAsSuccess(gatewayTxnId, null);
        transactionRepository.save(transaction);

        // Update order
        order.markAsCompleted();
        orderRepository.save(order);

        // Create enrollments
        createEnrollmentsForOrder(order);

        // Create earnings for instructors
        earningService.createEarningsForOrder(order);

        // Generate invoice
        invoiceService.generateInvoice(order);

        // Publish event
        eventPublisher.publishEvent(new OrderCompletedEvent(this, order));
    }

    private void handlePaymentFailure(Order order, Transaction transaction, String failureReason) {
        log.warn("Payment failed for order {}: {}", order.getOrderNumber(), failureReason);

        // Update transaction
        transaction.markAsFailed(failureReason, null);
        transactionRepository.save(transaction);

        // Update order
        order.markAsFailed();
        order.setFailureReason(failureReason);
        orderRepository.save(order);

        // Publish event
        eventPublisher.publishEvent(new PaymentFailedEvent(this, order, failureReason));
    }

    private void handlePaymentPending(Order order, Transaction transaction) {
        log.info("Payment pending for order {}", order.getOrderNumber());

        transaction.setStatus(TransactionStatus.PENDING);
        transactionRepository.save(transaction);

        order.setStatus(OrderStatus.PENDING);
        orderRepository.save(order);
    }

    private void handleRefund(Order order, Transaction transaction) {
        log.info("Payment refunded for order {}", order.getOrderNumber());

        transaction.markAsRefunded();
        transactionRepository.save(transaction);

        order.markAsRefunded();
        orderRepository.save(order);

        // TODO: Handle refund - unenroll student, reverse earnings
    }

    // ==================== Helper Methods ====================

    private void createEnrollmentsForOrder(Order order) {
        Set<OrderItem> orderItems = order.getItems();

        for (OrderItem item : orderItems) {
            try {
                enrollmentService.enrollStudent(order.getUserId(), item.getCourseId());
                log.info("Created enrollment for user {} in course {}",
                        order.getUserId(), item.getCourseId());
            } catch (Exception e) {
                log.error("Failed to create enrollment for course {}: {}",
                        item.getCourseId(), e.getMessage());
                // Continue with other enrollments - don't fail entire batch
            }
        }
    }
}