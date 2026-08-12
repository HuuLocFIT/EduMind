package com.edumind.lms.modules.payment.service;

import com.edumind.lms.modules.payment.dto.request.WebhookPayloadRequest;
import com.edumind.lms.modules.payment.entity.*;
import com.edumind.lms.modules.payment.enums.OrderStatus;
import com.edumind.lms.modules.payment.enums.PaymentMethod;
import com.edumind.lms.modules.payment.enums.TransactionStatus;
import com.edumind.lms.modules.payment.event.OrderCompletedEvent;
import com.edumind.lms.modules.payment.event.PaymentFailedEvent;
import com.edumind.lms.modules.payment.event.PaymentPendingEvent;
import com.edumind.lms.modules.payment.event.RefundCompletedEvent;
import com.edumind.lms.modules.payment.exception.OrderNotFoundException;

import com.edumind.lms.modules.payment.gateway.impl.PayPalGatewayProperties;
import com.edumind.lms.modules.payment.repository.*;
import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;
import org.springframework.core.ParameterizedTypeReference;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.List;
import java.util.Map;

@Service
@Slf4j
public class WebhookServiceImpl implements WebhookService {

    private final OrderRepository orderRepository;
    private final TransactionRepository transactionRepository;
    private final InstructorEarningRepository earningRepository;
    private final RefundRequestRepository refundRequestRepository;
    private final OrderItemRepository orderItemRepository;
    private final ApplicationEventPublisher eventPublisher;
    private final PayPalGatewayProperties payPalProperties;
    private final NumberGeneratorService numberGeneratorService;
    private final RestTemplate restTemplate;

    public WebhookServiceImpl(
            OrderRepository orderRepository,
            TransactionRepository transactionRepository,
            InstructorEarningRepository earningRepository,
            RefundRequestRepository refundRequestRepository,
            OrderItemRepository orderItemRepository,
            ApplicationEventPublisher eventPublisher,
            NumberGeneratorService numberGeneratorService,
            RestTemplate restTemplate,
            @org.springframework.beans.factory.annotation.Autowired(required = false)
            PayPalGatewayProperties payPalProperties) {
        this.orderRepository = orderRepository;
        this.transactionRepository = transactionRepository;
        this.earningRepository = earningRepository;
        this.refundRequestRepository = refundRequestRepository;
        this.orderItemRepository = orderItemRepository;
        this.eventPublisher = eventPublisher;
        this.numberGeneratorService = numberGeneratorService;
        this.restTemplate = restTemplate;
        this.payPalProperties = payPalProperties;
    }

    @Value("${payment.sepay.webhook-secret:}")
    private String sepayWebhookSecret;

    @Value("${payment.sepay.enforce-signature:true}")
    private boolean sepayEnforceSignature;

    @Value("${payment.paypal.webhook-id:}")
    private String paypalWebhookId;

    @Value("${payment.paypal.allow-unsigned-webhooks:false}")
    private boolean allowUnsignedPayPalWebhooks;

    // ==================== Main Handler ====================

    @Override
    @Transactional
    public void handleWebhook(PaymentMethod gateway, WebhookPayloadRequest request) {
        log.info("Processing {} webhook: orderNumber={}, status={}",
                gateway, request.getOrderNumber(), request.getStatus());

        // Find order by order number (with items for cart clearing)
        Order order;
        if (request.getOrderNumber() != null) {
            order = orderRepository.findWithItemsByOrderNumber(request.getOrderNumber())
                    .orElseThrow(() -> new OrderNotFoundException(
                            "Order not found: " + request.getOrderNumber()));
        } else {
            // orderNumber is null - try alternative lookup (e.g., PayPal refund webhooks
            // where the resource is a refund object without custom_id)
            String status = request.getStatus() != null ? request.getStatus().toUpperCase() : "";
            if ("REFUNDED".equals(status) || "REVERSED".equals(status)) {
                // Try to find order via RefundRequest.gatewayRefundId
                String refundId = request.getResourceId() != null ? request.getResourceId() : request.getTransactionId();
                order = refundRequestRepository.findByGatewayRefundId(refundId)
                        .flatMap(refundReq -> orderRepository.findById(refundReq.getOrder().getId()))
                        .orElse(null);

                if (order == null) {
                    log.warn("Refund webhook received but could not find order by refundId={}. " +
                            "This may be a refund processed outside our system. Ignoring gracefully.", refundId);
                    return;
                }

                // If order is already refunded, this is idempotent - just log and return
                if (order.getStatus() == OrderStatus.REFUNDED) {
                    log.info("Refund webhook for order {} (refundId={}) - order already REFUNDED. " +
                            "Skipping duplicate webhook processing.", order.getOrderNumber(), refundId);
                    return;
                }
            } else {
                throw new OrderNotFoundException("Order not found: " + request.getOrderNumber());
            }
        }

        // Find or create transaction for this order
        // This handles the edge case where webhook arrives before transaction is created
        Transaction transaction = transactionRepository.findFirstByOrderIdOrderByCreatedAtDesc(order.getId())
                .orElseGet(() -> {
                    log.warn("No transaction found for order {} - creating from webhook", request.getOrderNumber());
                    return createTransactionFromWebhook(order, gateway, request);
                });

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

    /**
     * Create a transaction record from webhook data.
     * Used when webhook arrives before transaction was created (timing edge case).
     */
    private Transaction createTransactionFromWebhook(Order order, PaymentMethod gateway, WebhookPayloadRequest request) {
        Transaction transaction = new Transaction();
        transaction.setTransactionNumber(numberGeneratorService.generateTransactionNumber());
        transaction.setOrder(order);
        transaction.setGateway(gateway);
        transaction.setAmount(request.getAmount() != null ? request.getAmount() : order.getTotalAmount());
        transaction.setCurrency(request.getCurrency() != null ? request.getCurrency() : order.getCurrency());
        transaction.setStatus(TransactionStatus.PENDING);
        transaction.setGatewayTransactionId(request.getTransactionId());
        transaction.setCreatedAt(LocalDateTime.now());

        Transaction saved = transactionRepository.save(transaction);
        log.info("Created transaction {} from webhook for order {}",
                saved.getTransactionNumber(), order.getOrderNumber());
        return saved;
    }

    // ==================== Signature Verification ====================

    @Override
    public boolean verifySignature(PaymentMethod gateway, WebhookPayloadRequest request, String signature) {
        return switch (gateway) {
            case MOCK -> true; // No verification for mock
            case PAYPAL -> verifyPayPalSignature(request, null, null, signature, null, null, null);
            case SEPAY -> verifySepaySignature(request, signature);
            default -> {
                log.warn("No signature verification for gateway: {}", gateway);
                yield true;
            }
        };
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

        boolean hasAnySignatureHeader =
                (signature != null && !signature.isBlank())
                        || (transmissionId != null && !transmissionId.isBlank())
                        || (transmissionTime != null && !transmissionTime.isBlank())
                        || (certUrl != null && !certUrl.isBlank())
                        || (authAlgo != null && !authAlgo.isBlank());

        if (allowUnsignedPayPalWebhooks && !hasAnySignatureHeader) {
            log.warn("PayPal webhook signature verification is disabled by explicit configuration. Do not enable this outside automated tests.");
            return true;
        }

        if (paypalWebhookId == null || paypalWebhookId.isBlank()) {
            log.error("Rejecting PayPal webhook because PAYPAL_WEBHOOK_ID is not configured.");
            return false;
        }

        if (signature == null || signature.isBlank()) {
            log.warn("Rejecting PayPal webhook without a signature for order {}.",
                    request.getOrderNumber());
            return false;
        }

        // Validate required headers
        if (transmissionId == null || transmissionTime == null || certUrl == null || authAlgo == null) {
            log.warn("Missing PayPal webhook headers for verification. " +
                    "transmissionId={}, transmissionTime={}, certUrl={}, authAlgo={}",
                    transmissionId != null, transmissionTime != null, certUrl != null, authAlgo != null);
            // If signature is present and webhook id is configured, we must reject.
            return false;
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
            log.error("PayPal properties are not configured - rejecting webhook");
            return false;
        }

        String verifyUrl = payPalProperties.getBaseUrl() + "/v1/notifications/verify-webhook-signature";

        log.debug("PayPal webhook verification: webhook_id={}, mode={}, transmission_id={}",
                paypalWebhookId, payPalProperties.getMode(), transmissionId);
        log.debug("PayPal webhook event keys: {}", webhookEvent != null ? webhookEvent.keySet() : "null");

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
            // restTemplate is injected via constructor — connection pooling, keep-alive

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("Authorization", "Basic " + getPayPalAuthHeader());

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(verifyRequest, headers);

            ResponseEntity<Map<String, Object>> response = restTemplate.exchange(
                    verifyUrl,
                    HttpMethod.POST,
                    entity,
                    new ParameterizedTypeReference<>() {}
            );

            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                String verificationStatus = (String) response.getBody().get("verification_status");
                boolean verified = "SUCCESS".equals(verificationStatus);

                if (!verified) {
                    log.warn("PayPal webhook verification failed. Status: {}. " +
                            "Check that PAYPAL_WEBHOOK_ID='{}' matches your PayPal Dashboard webhook ID, " +
                            "and mode='{}' matches the webhook environment (sandbox/live).",
                            verificationStatus, paypalWebhookId, payPalProperties.getMode());
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

    /**
     * Verify SePay webhook authorization.
     * SePay sends: Authorization: Apikey <YOUR_TOKEN>
     */
    private boolean verifySepaySignature(WebhookPayloadRequest request, String authorization) {
        // Check if webhook secret is configured
        if (sepayWebhookSecret == null || sepayWebhookSecret.isEmpty()) {
            if (sepayEnforceSignature) {
                log.error("SECURITY: SePay webhook secret not configured but verification is enabled. " +
                        "Rejecting webhook. Configure payment.sepay.webhook-secret or set payment.sepay.enforce-signature=false for development.");
                return false;
            } else {
                log.warn("SePay authorization verification skipped - no secret configured (enforce-signature=false)");
                return true;
            }
        }

        // Reject webhooks without authorization when enforcement is enabled
        if (authorization == null || authorization.isEmpty()) {
            if (sepayEnforceSignature) {
                log.error("SECURITY: Missing SePay Authorization header for order {} - rejecting webhook. " +
                        "Configure API Key authentication in SePay dashboard.", request.getOrderNumber());
                return false;
            } else {
                log.warn("Missing SePay Authorization header for order {} - allowing (enforce-signature=false)",
                        request.getOrderNumber());
                return true;
            }
        }

        // SePay sends: "Apikey <YOUR_TOKEN>"
        // Using substring verification to avoid string concatenation and ensure correct format
        boolean valid = false;
        if (authorization.startsWith("Apikey ")) {
            String actualKey = authorization.substring(7).trim();
            valid = sepayWebhookSecret.equals(actualKey);
        }

        if (!valid) {
            log.error("SECURITY: Invalid SePay Authorization for order {}. Expected format: Apikey <SECRET>. Rejecting webhook.",
                    request.getOrderNumber());
        } else {
            log.debug("SePay authorization verified successfully for order {}", request.getOrderNumber());
        }

        return valid;
    }

    // ==================== Payment Status Handlers ====================

    /**
     * Handle successful payment from webhook.
     * Includes idempotency check to prevent duplicate processing.
     */
    private void handlePaymentSuccess(Order order, Transaction transaction, String gatewayTxnId) {
        log.info("Payment success webhook for order {}, gateway txn: {}",
                order.getOrderNumber(), gatewayTxnId);

        // Idempotency check — separate "payment processed" from "side effects ran"
        if (order.getStatus() == OrderStatus.COMPLETED && order.isSideEffectsPublished()) {
            log.info("Order {} already COMPLETED and side effects published — skipping duplicate webhook processing.",
                    order.getOrderNumber());
            return;
        }

        // Recovery path: order COMPLETED but side effects failed on a previous attempt
        if (order.getStatus() == OrderStatus.COMPLETED && !order.isSideEffectsPublished()) {
            log.warn("Order {} is COMPLETED but side effects were not published — re-publishing event",
                    order.getOrderNumber());
            publishOrderCompletedEvent(order, false);
            order.setSideEffectsPublished(true);
            orderRepository.save(order);
            return;
        }

        // Check transaction status to prevent duplicate processing
        if (transaction.getStatus() == TransactionStatus.SUCCESS) {
            log.info("Transaction for order {} already SUCCESS - skipping duplicate webhook processing",
                    order.getOrderNumber());
            return;
        }

        // Update transaction
        transaction.markAsSuccess(gatewayTxnId, null);
        transactionRepository.save(transaction);

        // Update order
        order.markAsCompleted();
        orderRepository.save(order);

        // Publish event — async listeners handle all side-effects:
        // enrollment (CourseEventListener), cart clearing, earnings, invoice (PaymentEventListener).
        publishOrderCompletedEvent(order, false);

        // Mark side effects as published
        order.setSideEffectsPublished(true);
        orderRepository.save(order);

        log.info("Successfully processed payment webhook for order {}", order.getOrderNumber());
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
        eventPublisher.publishEvent(new PaymentFailedEvent(
                this,
                order.getId(),
                order.getOrderNumber(),
                order.getUserId(),
                failureReason
        ));
    }

    private void handlePaymentPending(Order order, Transaction transaction) {
        log.warn("Payment pending for order {}", order.getOrderNumber());

        transaction.setStatus(TransactionStatus.PENDING);
        transactionRepository.save(transaction);

        order.setStatus(OrderStatus.PENDING);
        orderRepository.save(order);

        // Publish event for audit consistency (analogous to handlePaymentFailure)
        eventPublisher.publishEvent(new PaymentPendingEvent(
                this, order.getId(), order.getOrderNumber(), order.getUserId()));
    }

    private void handleRefund(Order order, Transaction transaction) {
        log.info("Payment refunded via webhook for order {}", order.getOrderNumber());

        transaction.markAsRefunded();
        transactionRepository.save(transaction);

        order.markAsRefunded("Refunded via payment gateway webhook");
        orderRepository.save(order);

        // Reverse earnings
        List<InstructorEarning> earnings = earningRepository.findByOrderId(order.getId());
        for (InstructorEarning earning : earnings) {
            if (earning.isPaid()) {
                log.warn("MANUAL RECOVERY REQUIRED: Earning {} for instructor {} is already PAID (amount: {}). "
                        + "Webhook refund for order {} requires manual clawback from instructor.",
                        earning.getId(), earning.getInstructorId(), earning.getNetAmount(), order.getOrderNumber());
            }
            earning.markAsRefunded();
        }
        earningRepository.saveAll(earnings);

        // Determine refund amount and type from RefundRequest (if one exists).
        // Gateway-initiated refunds with no matching RefundRequest are treated as full refunds.
        BigDecimal refundAmount = order.getTotalAmount();
        boolean isFullRefund = true;

        RefundRequest existingRefund = refundRequestRepository.findByOrderId(order.getId()).orElse(null);
        if (existingRefund != null) {
            refundAmount = existingRefund.getRequestedAmount();
            isFullRefund = refundAmount.compareTo(order.getTotalAmount()) >= 0;
            if (!existingRefund.isCompleted()) {
                existingRefund.markAsCompleted(null, null, "Processed via gateway webhook");
                refundRequestRepository.save(existingRefund);
            }
        }

        // Publish refund completion for enrollment revocation (async, idempotent)
        List<Long> courseIds = orderItemRepository.findByOrderId(order.getId()).stream()
                .map(OrderItem::getCourseId)
                .toList();

        eventPublisher.publishEvent(new RefundCompletedEvent(
                this,
                order.getId(),
                order.getOrderNumber(),
                order.getUserId(),
                courseIds,
                refundAmount,
                isFullRefund
        ));
    }

    private void publishOrderCompletedEvent(Order order, boolean freeOrder) {
        List<OrderCompletedEvent.OrderItemInfo> items = orderItemRepository.findByOrderId(order.getId()).stream()
                .map(oi -> new OrderCompletedEvent.OrderItemInfo(
                        oi.getCourseId(),
                        oi.getCourseTitle(),
                        oi.getInstructorId(),
                        oi.getFinalPrice()
                ))
                .toList();

        eventPublisher.publishEvent(new OrderCompletedEvent(
                this,
                order.getId(),
                order.getOrderNumber(),
                order.getUserId(),
                items,
                order.getTotalAmount(),
                order.getCurrency(),
                freeOrder
        ));
    }
}
