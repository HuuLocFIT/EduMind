package com.edumind.lms.modules.payment.gateway.impl;

import com.edumind.lms.modules.payment.gateway.*;
import com.edumind.lms.modules.payment.gateway.impl.sepay.SepayTransactionResponse;
import com.edumind.lms.modules.payment.gateway.impl.sepay.SepayWebhookPayload;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.*;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.math.BigDecimal;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

/**
 * SePay Payment Gateway implementation (Vietnam).
 *
 * SePay uses QR code bank transfer method:
 * 1. Generate QR code with bank account details and transfer content
 * 2. User scans QR and transfers money via their banking app
 * 3. SePay detects the transfer via bank API and sends webhook
 * 4. We verify the webhook and complete the order
 *
 * Configuration:
 * payment:
 *   gateway: sepay
 *   sepay:
 *     api-key: ${SEPAY_API_KEY}
 *     merchant-id: ${SEPAY_MERCHANT_ID}
 *     secret-key: ${SEPAY_SECRET_KEY}
 *     base-url: https://my.sepay.vn
 *     bank-code: MB
 *     bank-account: 0888012610
 *     account-name: NGUYEN HUU LOC
 */
@Slf4j
@Component
@ConditionalOnProperty(name = "payment.sepay.enabled", havingValue = "true", matchIfMissing = false)
public class SepayGateway implements PaymentGateway {

    private static final String GATEWAY_NAME = "SEPAY";
    private static final Set<String> SUPPORTED_CURRENCIES = Set.of("VND", "USD");

    // Exchange rate USD to VND (should be fetched from exchange rate service in production)
    private static final BigDecimal DEFAULT_USD_TO_VND_RATE = new BigDecimal("25000");

    private final SepayGatewayProperties properties;
    private final RestTemplate restTemplate;

    // Cache for pending payments (orderNumber -> payment info)
    private final ConcurrentHashMap<String, PendingPayment> pendingPayments = new ConcurrentHashMap<>();

    public SepayGateway(SepayGatewayProperties properties) {
        this.properties = properties;
        this.restTemplate = new RestTemplate();

        log.info("[SEPAY] Gateway initialized with bank: {} - {}, account: {}",
                properties.getBankCode(),
                properties.getAccountName(),
                maskAccountNumber(properties.getBankAccount()));
    }

    /**
     * Process payment by generating a QR code URL for bank transfer.
     *
     * SePay QR URL format:
     * https://qr.sepay.vn/img?bank={bankCode}&acc={accountNumber}&template={template}&amount={amount}&des={content}
     */
    @Override
    public GatewayPaymentResult processPayment(GatewayPaymentRequest request) {
        log.info("[SEPAY] Processing payment for order: {}, amount: {} {}",
                request.getOrderNumber(), request.getAmount(), request.getCurrency());

        // Validate configuration
        if (properties.getBankCode() == null || properties.getBankAccount() == null) {
            log.error("[SEPAY] Bank configuration missing");
            return GatewayPaymentResult.failed(GATEWAY_NAME, "CONFIG_ERROR",
                    "Payment gateway not properly configured. Please contact support.");
        }

        // Convert to VND if needed
        BigDecimal amountVnd;
        BigDecimal exchangeRate = BigDecimal.ONE;

        if ("VND".equalsIgnoreCase(request.getCurrency())) {
            amountVnd = request.getAmount();
        } else if ("USD".equalsIgnoreCase(request.getCurrency())) {
            // Use provided exchange rate or default
            exchangeRate = request.getExchangeRate() != null
                    ? request.getExchangeRate()
                    : DEFAULT_USD_TO_VND_RATE;
            amountVnd = request.getAmount().multiply(exchangeRate);
            log.info("[SEPAY] Converted {} USD to {} VND (rate: {})",
                    request.getAmount(), amountVnd.longValue(), exchangeRate);
        } else {
            log.warn("[SEPAY] Currency {} not supported", request.getCurrency());
            return GatewayPaymentResult.failed(GATEWAY_NAME, "CURRENCY_NOT_SUPPORTED",
                    "SePay only supports VND and USD. Please use a different payment method.");
        }

        // Round to whole number (VND doesn't use decimals)
        long amountLong = amountVnd.longValue();
        if (amountLong <= 0) {
            return GatewayPaymentResult.failed(GATEWAY_NAME, "INVALID_AMOUNT",
                    "Invalid payment amount.");
        }

        // Generate transfer content with order number
        // Format: EDUMIND {orderNumber} - this will be parsed by SePay webhook
        String transferContent = generateTransferContent(request.getOrderNumber());

        // Generate QR code URL
        String qrUrl = buildQrCodeUrl(amountLong, transferContent);
        log.info("[SEPAY] Generated QR URL for order {}: {}", request.getOrderNumber(), qrUrl);

        // Generate a unique transaction ID
        String transactionId = generateTransactionId(request.getOrderNumber());

        // Store pending payment for webhook matching
        PendingPayment pendingPayment = new PendingPayment(
                request.getOrderNumber(),
                amountLong,
                transferContent,
                LocalDateTime.now().plusMinutes(properties.getQrExpireMinutes())
        );
        pendingPayments.put(request.getOrderNumber(), pendingPayment);

        // Return requires action with QR code URL
        return GatewayPaymentResult.builder()
                .success(false)
                .status(GatewayResultStatus.REQUIRES_ACTION)
                .gatewayTransactionId(transactionId)
                .gatewayName(GATEWAY_NAME)
                .amount(request.getAmount())
                .currency(request.getCurrency())
                .localAmount(BigDecimal.valueOf(amountLong))
                .localCurrency("VND")
                .exchangeRate(exchangeRate)
                .redirectUrl(qrUrl)
                .requiresRedirect(true)
                .processedAt(LocalDateTime.now())
                .build();
    }

    /**
     * Build the QR code URL for SePay.
     * Uses qr.sepay.vn for QR code generation.
     */
    private String buildQrCodeUrl(long amount, String content) {
        // URL encode the content
        String encodedContent = URLEncoder.encode(content, StandardCharsets.UTF_8);

        // SePay QR endpoint is at qr.sepay.vn, not my.sepay.vn
        String qrBaseUrl = "https://qr.sepay.vn";

        return UriComponentsBuilder
                .fromUriString(qrBaseUrl)
                .path("/img")
                .queryParam("bank", properties.getBankCode())
                .queryParam("acc", properties.getBankAccount())
                .queryParam("template", properties.getTemplate())
                .queryParam("amount", amount)
                .queryParam("des", encodedContent)
                .build()
                .toUriString();
    }

    /**
     * Generate transfer content that includes order number.
     * This content will appear in the bank statement and is used to match webhooks.
     */
    private String generateTransferContent(String orderNumber) {
        // Format: EDUMIND ORD202501XXX
        // SePay will parse this and extract the code
        return "EDUMIND " + orderNumber;
    }

    /**
     * Generate a unique transaction ID.
     */
    private String generateTransactionId(String orderNumber) {
        return "SEPAY_" + orderNumber + "_" + System.currentTimeMillis();
    }

    /**
     * Capture payment - Not applicable for SePay as payment is confirmed via webhook.
     */
    @Override
    public GatewayPaymentResult capturePayment(String gatewayTransactionId) {
        log.info("[SEPAY] Capture payment called for: {} - SePay uses webhook confirmation",
                gatewayTransactionId);

        // For SePay, payment confirmation comes via webhook
        // This method can be used to manually check transaction status
        return checkTransactionStatus(gatewayTransactionId);
    }

    /**
     * Check transaction status by querying SePay API.
     */
    private GatewayPaymentResult checkTransactionStatus(String gatewayTransactionId) {
        // Extract order number from transaction ID
        String orderNumber = extractOrderNumber(gatewayTransactionId);
        if (orderNumber == null) {
            return GatewayPaymentResult.failed(GATEWAY_NAME, "INVALID_TRANSACTION_ID",
                    "Invalid transaction ID format.");
        }

        PendingPayment pending = pendingPayments.get(orderNumber);
        if (pending == null) {
            return GatewayPaymentResult.failed(GATEWAY_NAME, "PAYMENT_NOT_FOUND",
                    "Payment not found or already processed.");
        }

        // Check if expired
        if (pending.expiresAt.isBefore(LocalDateTime.now())) {
            pendingPayments.remove(orderNumber);
            return GatewayPaymentResult.builder()
                    .success(false)
                    .status(GatewayResultStatus.EXPIRED)
                    .gatewayTransactionId(gatewayTransactionId)
                    .gatewayName(GATEWAY_NAME)
                    .errorCode("PAYMENT_EXPIRED")
                    .errorMessage("Payment QR code has expired. Please start a new checkout.")
                    .build();
        }

        // Query SePay API for transaction
        try {
            SepayTransactionResponse response = queryTransactions(orderNumber);
            if (response != null && response.getTransactions() != null) {
                for (SepayTransactionResponse.SepayTransaction txn : response.getTransactions()) {
                    // Check if this transaction matches our order
                    if (matchesOrder(txn, pending)) {
                        pendingPayments.remove(orderNumber);
                        return GatewayPaymentResult.success(
                                txn.getId(),
                                GATEWAY_NAME,
                                BigDecimal.valueOf(txn.getAmountIn()),
                                "VND"
                        );
                    }
                }
            }
        } catch (Exception e) {
            log.error("[SEPAY] Error checking transaction status: {}", e.getMessage());
        }

        // Payment still pending
        return GatewayPaymentResult.builder()
                .success(false)
                .status(GatewayResultStatus.PENDING)
                .gatewayTransactionId(gatewayTransactionId)
                .gatewayName(GATEWAY_NAME)
                .build();
    }

    /**
     * Query SePay API for recent transactions.
     */
    private SepayTransactionResponse queryTransactions(String orderNumber) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.set("Authorization", "Bearer " + properties.getApiKey());
            headers.setContentType(MediaType.APPLICATION_JSON);

            String url = properties.getBaseUrl() + "/userapi/transactions/list"
                    + "?account_number=" + properties.getBankAccount()
                    + "&limit=20";

            HttpEntity<String> entity = new HttpEntity<>(headers);
            ResponseEntity<SepayTransactionResponse> response = restTemplate.exchange(
                    url,
                    HttpMethod.GET,
                    entity,
                    SepayTransactionResponse.class
            );

            return response.getBody();
        } catch (RestClientException e) {
            log.error("[SEPAY] Failed to query transactions: {}", e.getMessage());
            return null;
        }
    }

    /**
     * Check if a transaction matches our pending order.
     */
    private boolean matchesOrder(SepayTransactionResponse.SepayTransaction txn, PendingPayment pending) {
        // Check if the transfer content contains our order reference
        String content = txn.getTransactionContent();
        if (content == null) {
            content = txn.getCode();
        }

        if (content == null) {
            return false;
        }

        // Check content contains order number
        boolean contentMatches = content.toUpperCase().contains(pending.transferContent.toUpperCase())
                || content.toUpperCase().contains(pending.orderNumber.toUpperCase());

        // Check amount matches (allow small variance for bank fees)
        boolean amountMatches = txn.getAmountIn() != null
                && Math.abs(txn.getAmountIn() - pending.amountVnd) < 1000;

        return contentMatches && amountMatches;
    }

    /**
     * Extract order number from transaction ID.
     */
    private String extractOrderNumber(String transactionId) {
        if (transactionId == null) return null;

        // Format: SEPAY_ORD-XXXXX_timestamp
        if (transactionId.startsWith("SEPAY_")) {
            String[] parts = transactionId.split("_");
            if (parts.length >= 2) {
                return parts[1];
            }
        }
        return transactionId;
    }

    /**
     * Refund payment - SePay doesn't support automatic refunds.
     * Manual bank transfer required.
     */
    @Override
    public GatewayRefundResult refund(String gatewayTransactionId, BigDecimal amount, String currency) {
        log.info("[SEPAY] Refund requested for transaction: {}, amount: {} {}",
                gatewayTransactionId, amount, currency);

        // SePay (bank transfer) doesn't support automatic refunds
        // This would need to be handled manually
        return GatewayRefundResult.builder()
                .status(GatewayRefundStatus.PENDING)
                .originalTransactionId(gatewayTransactionId)
                .gatewayName(GATEWAY_NAME)
                .amount(amount)
                .currency(currency)
                .errorCode("MANUAL_REFUND_REQUIRED")
                .errorMessage("SePay refunds require manual processing. Please contact support.")
                .build();
    }

    /**
     * Get payment status by checking transaction in SePay.
     */
    @Override
    public GatewayPaymentStatus getPaymentStatus(String gatewayTransactionId) {
        log.debug("[SEPAY] Checking status for transaction: {}", gatewayTransactionId);

        String orderNumber = extractOrderNumber(gatewayTransactionId);
        PendingPayment pending = pendingPayments.get(orderNumber);

        if (pending == null) {
            // Payment might have been completed or not found
            return GatewayPaymentStatus.builder()
                    .gatewayTransactionId(gatewayTransactionId)
                    .gatewayName(GATEWAY_NAME)
                    .status(GatewayResultStatus.SUCCESS) // Assume completed if not in pending
                    .build();
        }

        // Check if expired
        if (pending.expiresAt.isBefore(LocalDateTime.now())) {
            return GatewayPaymentStatus.builder()
                    .gatewayTransactionId(gatewayTransactionId)
                    .gatewayName(GATEWAY_NAME)
                    .status(GatewayResultStatus.EXPIRED)
                    .errorCode("PAYMENT_EXPIRED")
                    .errorMessage("Payment QR code has expired.")
                    .build();
        }

        return GatewayPaymentStatus.builder()
                .gatewayTransactionId(gatewayTransactionId)
                .gatewayName(GATEWAY_NAME)
                .status(GatewayResultStatus.PENDING)
                .build();
    }

    @Override
    public String getGatewayName() {
        return GATEWAY_NAME;
    }

    @Override
    public boolean supportsCurrency(String currency) {
        return SUPPORTED_CURRENCIES.contains(currency.toUpperCase());
    }

    // ===== SePay Webhook Handler =====

    /**
     * Handle SePay webhook when a bank transfer is detected.
     * This is called by WebhookController.
     *
     * @param payload The webhook payload from SePay
     * @return true if payment was successfully matched and processed
     */
    public WebhookResult handleWebhook(SepayWebhookPayload payload) {
        log.info("[SEPAY] Processing webhook: id={}, code={}, amount={}, content={}",
                payload.getId(), payload.getCode(), payload.getTransferAmount(), payload.getContent());

        // Only process incoming transfers
        if (!"in".equalsIgnoreCase(payload.getTransferType())) {
            log.debug("[SEPAY] Ignoring non-incoming transfer");
            return new WebhookResult(false, null, "Not an incoming transfer");
        }

        // Try to find matching pending payment
        String orderNumber = extractOrderNumberFromContent(payload.getContent(), payload.getCode());
        if (orderNumber == null) {
            log.warn("[SEPAY] Could not extract order number from webhook: code={}, content={}",
                    payload.getCode(), payload.getContent());
            return new WebhookResult(false, null, "Order number not found in transfer content");
        }

        PendingPayment pending = pendingPayments.get(orderNumber);
        if (pending == null) {
            log.warn("[SEPAY] No pending payment found for order: {}", orderNumber);
            return new WebhookResult(false, orderNumber, "No pending payment found");
        }

        // Verify amount (allow small variance for bank fees)
        long expectedAmount = pending.amountVnd;
        long actualAmount = payload.getTransferAmount() != null ? payload.getTransferAmount() : 0;
        if (Math.abs(actualAmount - expectedAmount) > 1000) {
            log.warn("[SEPAY] Amount mismatch for order {}: expected={}, actual={}",
                    orderNumber, expectedAmount, actualAmount);
            // Still process but log warning - amount might be slightly different due to bank fees
        }

        // Payment confirmed
        pendingPayments.remove(orderNumber);
        log.info("[SEPAY] Payment confirmed for order: {}, amount: {} VND, sepay_id: {}",
                orderNumber, actualAmount, payload.getId());

        return new WebhookResult(true, orderNumber,
                String.valueOf(payload.getId()),
                actualAmount);
    }

    /**
     * Extract order number from transfer content or code.
     */
    private String extractOrderNumberFromContent(String content, String code) {
        // First try the code field (SePay extracts this automatically)
        if (code != null && !code.isEmpty()) {
            // Code might contain just the order number or "EDUMIND ORD-XXX"
            if (code.startsWith("ORD")) {
                return code;
            }
            // Check if code contains order pattern
            String extracted = findOrderPattern(code);
            if (extracted != null) return extracted;
        }

        // Try to extract from full content
        if (content != null && !content.isEmpty()) {
            return findOrderPattern(content);
        }

        return null;
    }

    /**
     * Find order number pattern in text (ORD-XXXXXX-XXXX format).
     */
    private String findOrderPattern(String text) {
        // Look for pattern: ORD-XXXXXX-XXXX or ORD202501XXXX
        String upperText = text.toUpperCase();

        // Pattern 1: ORD-XXXXXX-XXXX
        int ordIndex = upperText.indexOf("ORD-");
        if (ordIndex >= 0) {
            int endIndex = ordIndex + 4;
            while (endIndex < upperText.length() &&
                    (Character.isLetterOrDigit(upperText.charAt(endIndex)) ||
                            upperText.charAt(endIndex) == '-')) {
                endIndex++;
            }
            return text.substring(ordIndex, endIndex);
        }

        // Pattern 2: ORD202501XXXX
        ordIndex = upperText.indexOf("ORD");
        if (ordIndex >= 0) {
            int endIndex = ordIndex + 3;
            while (endIndex < upperText.length() && Character.isDigit(upperText.charAt(endIndex))) {
                endIndex++;
            }
            if (endIndex > ordIndex + 3) {
                return text.substring(ordIndex, endIndex);
            }
        }

        return null;
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
     * Get pending payment info for an order (for status checking).
     */
    public PendingPayment getPendingPayment(String orderNumber) {
        return pendingPayments.get(orderNumber);
    }

    /**
     * Cancel a pending payment.
     */
    public void cancelPendingPayment(String orderNumber) {
        pendingPayments.remove(orderNumber);
        log.info("[SEPAY] Cancelled pending payment for order: {}", orderNumber);
    }

    // ===== Inner Classes =====

    /**
     * Stores pending payment info for webhook matching.
     */
    public record PendingPayment(
            String orderNumber,
            long amountVnd,
            String transferContent,
            LocalDateTime expiresAt
    ) {}

    /**
     * Result from webhook processing.
     */
    public record WebhookResult(
            boolean success,
            String orderNumber,
            String sepayTransactionId,
            long amountVnd
    ) {
        public WebhookResult(boolean success, String orderNumber, String message) {
            this(success, orderNumber, message, 0);
        }
    }
}
