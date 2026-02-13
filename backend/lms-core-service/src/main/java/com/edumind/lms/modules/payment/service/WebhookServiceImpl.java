package com.edumind.lms.modules.payment.service;

import com.edumind.lms.modules.course.entity.Enrollment;
import com.edumind.lms.modules.course.enums.EnrollmentStatus;
import com.edumind.lms.modules.course.repository.EnrollmentRepository;
import com.edumind.lms.modules.course.service.EnrollmentService;
import com.edumind.lms.modules.payment.dto.request.WebhookPayloadRequest;
import com.edumind.lms.modules.payment.entity.*;
import com.edumind.lms.modules.payment.enums.OrderStatus;
import com.edumind.lms.modules.payment.enums.PaymentMethod;
import com.edumind.lms.modules.payment.enums.TransactionStatus;
import com.edumind.lms.modules.payment.event.OrderCompletedEvent;
import com.edumind.lms.modules.payment.event.PaymentFailedEvent;
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

import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
@Slf4j
public class WebhookServiceImpl implements WebhookService {

    private final OrderRepository orderRepository;
    private final TransactionRepository transactionRepository;
    private final InstructorEarningRepository earningRepository;
    private final RefundRequestRepository refundRequestRepository;
    private final OrderItemRepository orderItemRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final EnrollmentService enrollmentService;
    private final EarningService earningService;
    private final InvoiceService invoiceService;
    private final CartServiceImpl cartServiceImpl; // For REQUIRES_NEW transaction
    private final ApplicationEventPublisher eventPublisher;
    private final PayPalGatewayProperties payPalProperties;
    private final NumberGeneratorService numberGeneratorService;

    public WebhookServiceImpl(
            OrderRepository orderRepository,
            TransactionRepository transactionRepository,
            InstructorEarningRepository earningRepository,
            RefundRequestRepository refundRequestRepository,
            OrderItemRepository orderItemRepository,
            EnrollmentRepository enrollmentRepository,
            EnrollmentService enrollmentService,
            EarningService earningService,
            InvoiceService invoiceService,
            CartServiceImpl cartServiceImpl,
            ApplicationEventPublisher eventPublisher,
            NumberGeneratorService numberGeneratorService,
            @org.springframework.beans.factory.annotation.Autowired(required = false)
            PayPalGatewayProperties payPalProperties) {
        this.orderRepository = orderRepository;
        this.transactionRepository = transactionRepository;
        this.earningRepository = earningRepository;
        this.refundRequestRepository = refundRequestRepository;
        this.orderItemRepository = orderItemRepository;
        this.enrollmentRepository = enrollmentRepository;
        this.enrollmentService = enrollmentService;
        this.earningService = earningService;
        this.invoiceService = invoiceService;
        this.cartServiceImpl = cartServiceImpl;
        this.eventPublisher = eventPublisher;
        this.numberGeneratorService = numberGeneratorService;
        this.payPalProperties = payPalProperties;
    }

    @Value("${payment.sepay.webhook-secret:}")
    private String sepayWebhookSecret;

    @Value("${payment.sepay.enforce-signature:true}")
    private boolean sepayEnforceSignature;

    @Value("${payment.paypal.webhook-id:}")
    private String paypalWebhookId;

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

        // Idempotency check - prevent duplicate processing
        if (order.getStatus() == OrderStatus.COMPLETED) {
            log.info("Order {} already COMPLETED - skipping duplicate webhook processing", order.getOrderNumber());
            
            // Still attempt to clear cart to handle race conditions
            // where the other thread (e.g., Capture) completed the order but failed to clear the cart
            try {
                // We need to re-fetch items or use existing ones to get course IDs
                List<Long> courseIds = order.getItems().stream()
                        .map(OrderItem::getCourseId)
                        .toList();
                
                if (!courseIds.isEmpty()) {
                    log.info("Ensuring cart is cleared for already completed order {}. Items: {}", order.getOrderNumber(), courseIds);
                    cartServiceImpl.removeItemsInNewTransaction(order.getUserId(), courseIds);
                }
            } catch (Exception e) {
                log.error("Failed to ensure cart clearing for completed order {} (non-critical): {}", 
                        order.getOrderNumber(), e.getMessage());
            }
            
            return;
        }

        // Check transaction status to prevent duplicate processing
        if (transaction.getStatus() == TransactionStatus.SUCCESS) {
            log.info("Transaction for order {} already SUCCESS - skipping duplicate webhook processing",
                    order.getOrderNumber());
            return;
        }

        // Extract courseIds BEFORE any save operations
        // After save(), Hibernate may detach the collection or cause lazy loading issues
        List<Long> courseIds = order.getItems().stream()
                .map(OrderItem::getCourseId)
                .toList();
        Long userId = order.getUserId();
        String orderNumber = order.getOrderNumber();

        log.debug("Extracted {} course IDs from order {} for processing: {}", courseIds.size(), orderNumber, courseIds);

        // Update transaction
        transaction.markAsSuccess(gatewayTxnId, null);
        transactionRepository.save(transaction);

        // Update order
        order.markAsCompleted();
        orderRepository.save(order);

        // Create enrollments (with duplicate check inside)
        createEnrollmentsForOrder(order);

        // Clear cart items
        // Use separate transaction to ensure it commits even if invoice generation fails
        try {
            if (courseIds.isEmpty()) {
                log.warn("Order {} has no items - skipping cart cleanup", orderNumber);
            } else {
                log.info("Attempting to clear {} cart items for user {} after successful payment. Course IDs: {}",
                        courseIds.size(), userId, courseIds);
                try {
                    // Use removeItemsInNewTransaction to ensure cart clearing commits in separate transaction
                    // This prevents rollback if invoice generation fails later
                    cartServiceImpl.removeItemsInNewTransaction(userId, courseIds);
                    log.info("Successfully requested cart clearing for user {} after order {} completion",
                            userId, orderNumber);
                } catch (Exception e) {
                   log.error("Error during cart clearing call: {}", e.getMessage(), e);
                   throw e; // Rethrow to be caught by outer catch if needed, allows observing the error
                }
            }
        } catch (Exception e) {
            log.error("Failed to clear cart for user {} after order {} completion: {}",
                    userId, orderNumber, e.getMessage(), e);
        }

        // Create earnings for instructors
        try {
            earningService.createEarningsForOrder(order);
        } catch (Exception e) {
            log.error("Failed to create earnings for order {} (non-critical): {}",
                    order.getOrderNumber(), e.getMessage());
        }

        // Generate invoice and PDF
        try {
            var invoice = invoiceService.generateInvoice(order);
            // Generate PDF and upload to Cloudinary (same as PayPal flow)
            invoiceService.generateInvoicePdf(invoice.getId());
        } catch (Exception e) {
            log.error("Failed to generate invoice for order {} (non-critical): {}",
                    order.getOrderNumber(), e.getMessage());
        }

        // Publish event
        try {
            eventPublisher.publishEvent(new OrderCompletedEvent(this, order));
        } catch (Exception e) {
            log.error("Failed to publish OrderCompletedEvent for order {} (non-critical): {}",
                    order.getOrderNumber(), e.getMessage());
        }

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

        // Update RefundRequest if one exists
        refundRequestRepository.findByOrderId(order.getId()).ifPresent(refund -> {
            if (!refund.isCompleted()) {
                refund.markAsCompleted(null, null, "Processed via gateway webhook");
                refundRequestRepository.save(refund);
            }
        });

        // Revoke enrollments
        revokeEnrollments(order);
    }

    private void revokeEnrollments(Order order) {
        List<OrderItem> items = orderItemRepository.findByOrderId(order.getId());
        for (OrderItem item : items) {
            Enrollment enrollment = enrollmentRepository.findByCourseIdAndStudentId(
                    item.getCourseId(), order.getUserId())
                    .orElse(null);

            if (enrollment != null && enrollment.getStatus() == EnrollmentStatus.ACTIVE) {
                enrollment.setStatus(EnrollmentStatus.DROPPED);
                enrollmentRepository.save(enrollment);
                log.info("Enrollment revoked for user {} in course {} due to refund",
                        order.getUserId(), item.getCourseId());
            }
        }
    }

    // ==================== Helper Methods ====================

    /**
     * Create enrollments for order items.
     * Handles duplicates gracefully - if already enrolled, just logs and continues.
     */
    private void createEnrollmentsForOrder(Order order) {
        Set<OrderItem> orderItems = order.getItems();

        if (orderItems == null || orderItems.isEmpty()) {
            log.warn("No order items found for order {} - skipping enrollment creation", order.getOrderNumber());
            return;
        }

        int successCount = 0;
        int skipCount = 0;
        int failCount = 0;

        for (OrderItem item : orderItems) {
            try {
                // Check if already enrolled to avoid exception within transaction (which marks rollback-only)
                if (enrollmentService.isStudentEnrolled(item.getCourseId(), order.getUserId())) {
                    skipCount++;
                    log.info("User {} already enrolled in course {} - skipping (idempotent)",
                            order.getUserId(), item.getCourseId());
                    continue;
                }

                // EnrollmentService should handle duplicate check internally
                // but we catch any "already enrolled" exceptions gracefully
                enrollmentService.enrollStudent(item.getCourseId(), order.getUserId());
                successCount++;
                log.debug("Created enrollment for user {} in course {}",
                        order.getUserId(), item.getCourseId());
            } catch (IllegalStateException e) {
                // Likely "already enrolled" exception - this is OK for idempotency
                skipCount++;
                log.info("User {} already enrolled in course {} - skipping (idempotent)",
                        order.getUserId(), item.getCourseId());
            } catch (Exception e) {
                failCount++;
                log.error("Failed to create enrollment for user {} in course {}: {}",
                        order.getUserId(), item.getCourseId(), e.getMessage());
            }
        }

        log.info("Enrollment creation for order {}: {} created, {} skipped (already enrolled), {} failed",
                order.getOrderNumber(), successCount, skipCount, failCount);
    }
}