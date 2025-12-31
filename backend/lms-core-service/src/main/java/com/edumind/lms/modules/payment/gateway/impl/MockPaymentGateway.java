package com.edumind.lms.modules.payment.gateway.impl;

import com.edumind.lms.modules.payment.gateway.*;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.Map;
import java.util.Random;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Mock Payment Gateway for development and testing.
 *
 * Test card behaviors:
 * - Ends with "0000": Always SUCCESS
 * - Ends with "1111": Always FAIL (Card declined)
 * - Ends with "2222": Always FAIL (Insufficient funds)
 * - Ends with "3333": PENDING (Simulates async processing)
 * - Ends with "4444": REQUIRES_ACTION (Simulates 3DS)
 * - Others: Based on success-rate config (default 95%)
 *
 * Configuration in application.yml:
 * payment:
 *   gateway: mock
 *   mock:
 *     delay-ms: 1500
 *     success-rate: 0.95
 */
@Slf4j
@Component
@ConditionalOnProperty(name = "payment.gateway", havingValue = "mock", matchIfMissing = true)
public class MockPaymentGateway implements PaymentGateway {

    private static final String GATEWAY_NAME = "MOCK";

    // In-memory storage for mock transactions (for status checks)
    private final Map<String, MockTransaction> transactions = new ConcurrentHashMap<>();

    private final MockPaymentGatewayProperties properties;
    private final Random random = new Random();

    public MockPaymentGateway(MockPaymentGatewayProperties properties) {
        this.properties = properties;
        log.info("🔧 MockPaymentGateway initialized with delay={}ms, successRate={}",
                properties.getDelayMs(), properties.getSuccessRate());
    }

    @Override
    public GatewayPaymentResult processPayment(GatewayPaymentRequest request) {
        log.info("📤 [MOCK] Processing payment for order: {}, amount: {} {}",
                request.getOrderNumber(), request.getAmount(), request.getCurrency());

        // Simulate processing delay
        simulateDelay();

        String transactionId = generateTransactionId();
        String cardNumber = request.getCardNumber();

        GatewayPaymentResult result;

        // Determine result based on card number suffix
        if (cardNumber != null && cardNumber.length() >= 4) {
            String suffix = cardNumber.substring(cardNumber.length() - 4);
            result = processBasedOnCardSuffix(suffix, transactionId, request);
        } else {
            // No card number - use success rate
            result = processWithSuccessRate(transactionId, request);
        }

        // Store transaction for status checks
        storeTransaction(transactionId, request, result);

        log.info("📥 [MOCK] Payment result for {}: {} - {}",
                request.getOrderNumber(), result.getStatus(),
                result.isSuccess() ? result.getGatewayTransactionId() : result.getErrorMessage());

        return result;
    }

    @Override
    public GatewayRefundResult refund(String gatewayTransactionId, BigDecimal amount, String currency) {
        log.info("📤 [MOCK] Processing refund for transaction: {}, amount: {} {}",
                gatewayTransactionId, amount, currency);

        simulateDelay();

        MockTransaction original = transactions.get(gatewayTransactionId);

        if (original == null) {
            log.warn("⚠️ [MOCK] Transaction not found: {}", gatewayTransactionId);
            return GatewayRefundResult.failed(
                    gatewayTransactionId,
                    GATEWAY_NAME,
                    "TXN_NOT_FOUND",
                    "Original transaction not found"
            );
        }

        if (original.getStatus() != GatewayResultStatus.SUCCESS) {
            log.warn("⚠️ [MOCK] Cannot refund non-successful transaction: {}", gatewayTransactionId);
            return GatewayRefundResult.failed(
                    gatewayTransactionId,
                    GATEWAY_NAME,
                    "INVALID_STATUS",
                    "Cannot refund transaction with status: " + original.getStatus()
            );
        }

        if (amount.compareTo(original.getAmount()) > 0) {
            log.warn("⚠️ [MOCK] Refund amount exceeds original: {} > {}", amount, original.getAmount());
            return GatewayRefundResult.failed(
                    gatewayTransactionId,
                    GATEWAY_NAME,
                    "AMOUNT_EXCEEDED",
                    "Refund amount exceeds original transaction amount"
            );
        }

        String refundId = "REFUND_" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();

        // Update stored transaction
        original.setRefundedAmount(original.getRefundedAmount().add(amount));

        log.info("✅ [MOCK] Refund successful: {} for amount {} {}", refundId, amount, currency);

        return GatewayRefundResult.success(
                refundId,
                gatewayTransactionId,
                GATEWAY_NAME,
                amount,
                currency
        );
    }

    @Override
    public GatewayPaymentStatus getPaymentStatus(String gatewayTransactionId) {
        log.debug("🔍 [MOCK] Checking status for transaction: {}", gatewayTransactionId);

        MockTransaction transaction = transactions.get(gatewayTransactionId);

        if (transaction == null) {
            return GatewayPaymentStatus.builder()
                    .gatewayTransactionId(gatewayTransactionId)
                    .gatewayName(GATEWAY_NAME)
                    .status(GatewayResultStatus.FAILED)
                    .errorCode("TXN_NOT_FOUND")
                    .errorMessage("Transaction not found")
                    .build();
        }

        return GatewayPaymentStatus.builder()
                .gatewayTransactionId(gatewayTransactionId)
                .gatewayName(GATEWAY_NAME)
                .status(transaction.getStatus())
                .amount(transaction.getAmount())
                .currency(transaction.getCurrency())
                .hasRefund(transaction.getRefundedAmount().compareTo(BigDecimal.ZERO) > 0)
                .refundedAmount(transaction.getRefundedAmount())
                .createdAt(transaction.getCreatedAt())
                .completedAt(transaction.getCompletedAt())
                .build();
    }

    @Override
    public String getGatewayName() {
        return GATEWAY_NAME;
    }

    @Override
    public boolean supportsCurrency(String currency) {
        // Mock supports all currencies
        return true;
    }

    // ===== Private Helper Methods =====

    private GatewayPaymentResult processBasedOnCardSuffix(String suffix, String transactionId,
                                                          GatewayPaymentRequest request) {
        return switch (suffix) {
            case "0000" -> // Always success
                    GatewayPaymentResult.success(
                            transactionId,
                            GATEWAY_NAME,
                            request.getAmount(),
                            request.getCurrency()
                    );

            case "1111" -> // Card declined
                    GatewayPaymentResult.failed(
                            GATEWAY_NAME,
                            "CARD_DECLINED",
                            "Card was declined by issuer"
                    );

            case "2222" -> // Insufficient funds
                    GatewayPaymentResult.failed(
                            GATEWAY_NAME,
                            "INSUFFICIENT_FUNDS",
                            "Insufficient funds on card"
                    );

            case "3333" -> // Pending (async)
                    GatewayPaymentResult.pending(
                            transactionId,
                            GATEWAY_NAME,
                            null
                    );

            case "4444" -> // Requires 3DS
                    GatewayPaymentResult.requiresAction(
                            transactionId,
                            GATEWAY_NAME,
                            "https://mock-3ds.example.com/verify?txn=" + transactionId
                    );

            case "5555" -> // Expired card
                    GatewayPaymentResult.failed(
                            GATEWAY_NAME,
                            "CARD_EXPIRED",
                            "Card has expired"
                    );

            case "6666" -> // Invalid CVV
                    GatewayPaymentResult.failed(
                            GATEWAY_NAME,
                            "INVALID_CVV",
                            "Invalid security code"
                    );

            default -> // Use success rate
                    processWithSuccessRate(transactionId, request);
        };
    }

    private GatewayPaymentResult processWithSuccessRate(String transactionId,
                                                        GatewayPaymentRequest request) {
        if (random.nextDouble() < properties.getSuccessRate()) {
            return GatewayPaymentResult.success(
                    transactionId,
                    GATEWAY_NAME,
                    request.getAmount(),
                    request.getCurrency()
            );
        } else {
            // Random failure reason
            String[] errors = {"CARD_DECLINED", "PROCESSING_ERROR", "NETWORK_ERROR"};
            String[] messages = {
                    "Card was declined",
                    "Payment processing error",
                    "Network connection failed"
            };
            int idx = random.nextInt(errors.length);

            return GatewayPaymentResult.failed(GATEWAY_NAME, errors[idx], messages[idx]);
        }
    }

    private void simulateDelay() {
        try {
            Thread.sleep(properties.getDelayMs());
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }

    private String generateTransactionId() {
        return "MOCK_" + UUID.randomUUID().toString().substring(0, 12).toUpperCase();
    }

    private void storeTransaction(String transactionId, GatewayPaymentRequest request,
                                  GatewayPaymentResult result) {
        MockTransaction txn = new MockTransaction();
        txn.setTransactionId(transactionId);
        txn.setOrderNumber(request.getOrderNumber());
        txn.setAmount(request.getAmount());
        txn.setCurrency(request.getCurrency());
        txn.setStatus(result.getStatus());
        txn.setRefundedAmount(BigDecimal.ZERO);
        txn.setCreatedAt(java.time.LocalDateTime.now());
        if (result.isSuccess()) {
            txn.setCompletedAt(java.time.LocalDateTime.now());
        }

        transactions.put(transactionId, txn);
    }

    // ===== Inner Class for Transaction Storage =====

    @lombok.Data
    private static class MockTransaction {
        private String transactionId;
        private String orderNumber;
        private BigDecimal amount;
        private String currency;
        private GatewayResultStatus status;
        private BigDecimal refundedAmount;
        private java.time.LocalDateTime createdAt;
        private java.time.LocalDateTime completedAt;
    }
}
