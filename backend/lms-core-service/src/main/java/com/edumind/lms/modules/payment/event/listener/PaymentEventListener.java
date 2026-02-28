package com.edumind.lms.modules.payment.event.listener;

import com.edumind.lms.modules.payment.event.OrderCancelledEvent;
import com.edumind.lms.modules.payment.event.OrderCompletedEvent;
import com.edumind.lms.modules.payment.event.OrderCreatedEvent;
import com.edumind.lms.modules.payment.event.PaymentFailedEvent;
import com.edumind.lms.modules.payment.event.PaymentPendingEvent;
import com.edumind.lms.modules.payment.event.PayoutCompletedEvent;
import com.edumind.lms.modules.payment.event.RefundRequestedEvent;
import com.edumind.lms.modules.payment.service.CartService;
import com.edumind.lms.modules.payment.service.EarningService;
import com.edumind.lms.modules.payment.service.InvoiceService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class PaymentEventListener {

    private final CartService cartService;
    private final EarningService earningService;
    private final InvoiceService invoiceService;

    @Async("taskExecutor")
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void handleCartClearing(OrderCompletedEvent event) {
        if (event.getItems() == null || event.getItems().isEmpty()) {
            return;
        }

        List<Long> courseIds = event.getItems().stream()
                .filter(item -> item != null && item.courseId() != null)
                .map(OrderCompletedEvent.OrderItemInfo::courseId)
                .toList();

        if (courseIds.isEmpty()) {
            return;
        }

        try {
            cartService.removeItems(event.getUserId(), courseIds);
        } catch (Exception e) {
            log.error("Failed to clear cart for user {} after order {}: {}",
                    event.getUserId(), event.getOrderNumber(), e.getMessage());
        }
    }

    @Async("taskExecutor")
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void handleEarningsCreation(OrderCompletedEvent event) {
        try {
            earningService.createEarningsForOrder(event.getOrderId());
        } catch (Exception e) {
            log.error("Failed to create earnings for order {}: {}", event.getOrderNumber(), e.getMessage());
        }
    }

    @Async("taskExecutor")
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void handleInvoiceGeneration(OrderCompletedEvent event) {
        // Free-order flow generates invoice synchronously to return invoiceUrl in response.
        if (event.isFreeOrder()) {
            return;
        }

        Long invoiceId = null;
        try {
            var invoice = invoiceService.generateInvoice(event.getOrderId());
            invoiceId = invoice.getId();
            invoiceService.generateInvoicePdf(invoiceId);
        } catch (Exception e) {
            if (invoiceId != null) {
                // Invoice record was committed (REQUIRES_NEW) but PDF generation failed.
                // The invoice is valid and can have its PDF regenerated later.
                log.error("Invoice {} created but PDF generation failed for order {} – PDF can be retried: {}",
                        invoiceId, event.getOrderNumber(), e.getMessage());
            } else {
                log.error("Failed to generate invoice for order {}: {}", event.getOrderNumber(), e.getMessage());
            }
        }
    }

    /**
     * Audit-log handler for PaymentFailedEvent.
     * Prevents the event from being silently discarded.
     * TODO: publish notification to auth-service when email infrastructure is ready.
     */
    @Async("taskExecutor")
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void handlePaymentFailure(PaymentFailedEvent event) {
        log.warn("[AUDIT] Payment failed: orderId={}, orderNumber={}, userId={}, reason={}",
                event.getOrderId(), event.getOrderNumber(), event.getUserId(), event.getErrorMessage());
    }

    /**
     * Audit-log handler for PaymentPendingEvent.
     * Ensures consistency: success, failure, and pending all produce audit trails.
     */
    @Async("taskExecutor")
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void handlePaymentPending(PaymentPendingEvent event) {
        log.warn("[AUDIT] Payment pending: orderId={}, orderNumber={}, userId={}",
                event.getOrderId(), event.getOrderNumber(), event.getUserId());
    }

    @Async("taskExecutor")
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void handleOrderCreated(OrderCreatedEvent event) {
        log.info("[AUDIT] Order created: orderId={}, orderNumber={}, userId={}, totalAmount={} {}",
                event.getOrderId(), event.getOrderNumber(), event.getUserId(),
                event.getTotalAmount(), event.getCurrency());
        // TODO: trigger notification when notification module is ready
    }

    @Async("taskExecutor")
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void handleOrderCancelled(OrderCancelledEvent event) {
        log.info("[AUDIT] Order cancelled: orderId={}, orderNumber={}, userId={}",
                event.getOrderId(), event.getOrderNumber(), event.getUserId());
        // TODO: trigger notification when notification module is ready
    }

    @Async("taskExecutor")
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void handleRefundRequested(RefundRequestedEvent event) {
        log.warn("[AUDIT] Refund requested: refundRequestId={}, orderId={}, orderNumber={}, userId={}, amount={} {}",
                event.getRefundRequestId(), event.getOrderId(), event.getOrderNumber(),
                event.getUserId(), event.getRequestedAmount(), event.getCurrency());
        // TODO: trigger admin notification when notification module is ready
    }

    @Async("taskExecutor")
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void handlePayoutCompleted(PayoutCompletedEvent event) {
        log.info("[AUDIT] Payout completed: payoutId={}, payoutNumber={}, instructorId={}, totalAmount={} {}",
                event.getPayoutId(), event.getPayoutNumber(), event.getInstructorId(),
                event.getTotalAmount(), event.getCurrency());
        // TODO: trigger notification when notification module is ready
    }
}
