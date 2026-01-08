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
import com.edumind.lms.modules.payment.repository.OrderRepository;
import com.edumind.lms.modules.payment.repository.TransactionRepository;
import com.edumind.lms.modules.payment.service.EarningService;
import com.edumind.lms.modules.payment.service.InvoiceService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class WebhookServiceImpl implements WebhookService {

    private final OrderRepository orderRepository;
    private final TransactionRepository transactionRepository;
    private final EnrollmentService enrollmentService;
    private final EarningService earningService;
    private final InvoiceService invoiceService;
    private final ApplicationEventPublisher eventPublisher;

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
            case "FAILED", "DECLINED", "01" ->
                    handlePaymentFailure(order, transaction, request.getFailureReason());
            case "PENDING", "02" ->
                    handlePaymentPending(order, transaction);
            case "REFUNDED" ->
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
        // TODO: Implement PayPal signature verification in production
        if (paypalWebhookId == null || paypalWebhookId.isEmpty()) {
            log.warn("PayPal webhook verification skipped - no webhook ID configured");
            return true;
        }

        // In production, verify using PayPal SDK
        // Reference: https://developer.paypal.com/docs/api/webhooks/v1/#verify-webhook-signature
        log.info("PayPal signature verification for order: {}", request.getOrderNumber());
        return true;
    }

    private boolean verifySepaySignature(WebhookPayloadRequest request, String signature) {
        // TODO: Implement SePay signature verification in production
        if (sepayWebhookSecret == null || sepayWebhookSecret.isEmpty()) {
            log.warn("SePay signature verification skipped - no secret configured");
            return true;
        }

        // Verify HMAC-SHA256 signature
        // String dataToSign = request.getOrderNumber() + request.getAmount() + request.getStatus();
        // String expectedSignature = HmacUtils.hmacSha256Hex(sepayWebhookSecret, dataToSign);
        // return expectedSignature.equals(signature);

        log.info("SePay signature verification for order: {}", request.getOrderNumber());
        return true;
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
        List<OrderItem> orderItems = order.getItems();

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