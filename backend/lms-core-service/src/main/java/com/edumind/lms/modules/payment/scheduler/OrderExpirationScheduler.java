package com.edumind.lms.modules.payment.scheduler;

import com.edumind.lms.modules.payment.entity.Order;
import com.edumind.lms.modules.payment.enums.OrderStatus;
import com.edumind.lms.modules.payment.enums.TransactionStatus;
import com.edumind.lms.modules.payment.repository.OrderRepository;
import com.edumind.lms.modules.payment.repository.TransactionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Scheduled job to clean up expired orders that were never completed.
 * This handles cases where users abandon checkout (e.g., close PayPal page without completing).
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class OrderExpirationScheduler {

    private final OrderRepository orderRepository;
    private final TransactionRepository transactionRepository;

    /**
     * Runs every 5 minutes to expire stuck orders.
     * Orders in PENDING or PROCESSING state past their expiration time will be marked as FAILED.
     */
    @Scheduled(fixedRate = 5 * 60 * 1000) // Every 5 minutes
    @Transactional
    public void expireStuckOrders() {
        LocalDateTime now = LocalDateTime.now();
        List<Order> expiredOrders = orderRepository.findExpiredActiveOrders(now);

        if (expiredOrders.isEmpty()) {
            log.debug("No expired orders found during scheduled cleanup");
            return;
        }

        log.info("Found {} expired orders to clean up", expiredOrders.size());

        int expiredCount = 0;
        for (Order order : expiredOrders) {
            try {
                expireOrder(order);
                expiredCount++;
            } catch (Exception e) {
                log.error("Failed to expire order {}: {}", order.getOrderNumber(), e.getMessage(), e);
            }
        }

        log.info("Successfully expired {} orders", expiredCount);
    }

    private void expireOrder(Order order) {
        log.info("Expiring order {} (status: {}, created: {}, expired: {})",
                order.getOrderNumber(),
                order.getStatus(),
                order.getCreatedAt(),
                order.getExpiresAt());

        // Mark order as FAILED
        order.setStatus(OrderStatus.FAILED);
        order.setFailureReason("Order expired - payment not completed within time limit");
        order.setUpdatedAt(LocalDateTime.now());
        orderRepository.save(order);

        // Mark any pending transactions as FAILED
        transactionRepository.findFirstByOrderIdAndStatusOrderByCreatedAtDesc(
                order.getId(), TransactionStatus.PENDING)
                .ifPresent(tx -> {
                    tx.setStatus(TransactionStatus.FAILED);
                    tx.setFailureCode("ORDER_EXPIRED");
                    tx.setFailureReason("Order expired before payment completion");
                    transactionRepository.save(tx);
                    log.debug("Marked transaction {} as FAILED for expired order {}",
                            tx.getTransactionNumber(), order.getOrderNumber());
                });
    }
}
