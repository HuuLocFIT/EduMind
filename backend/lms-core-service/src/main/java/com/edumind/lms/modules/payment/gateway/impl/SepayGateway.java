package com.edumind.lms.modules.payment.gateway.impl;

import com.edumind.lms.modules.payment.gateway.*;
import com.edumind.lms.modules.payment.gateway.impl.sepay.SepayTransactionResponse;
import com.edumind.lms.modules.payment.gateway.impl.sepay.SepayWebhookPayload;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.*;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Iterator;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * SePay Payment Gateway implementation (Vietnam).
 *
 * SePay uses QR code bank transfer method:
 * 1. Generate QR code with bank account details and transfer content
 * 2. User scans QR and transfers money via their banking app
 * 3. SePay detects the transfer via bank API and sends webhook
 * 4. We verify the webhook and complete the order
 */
@Slf4j
@Component
@ConditionalOnProperty(name = "payment.sepay.enabled", havingValue = "true", matchIfMissing = false)
public class SepayGateway implements PaymentGateway {

    private static final String GATEWAY_NAME = "SEPAY";
    private static final Set<String> SUPPORTED_CURRENCIES = Set.of("VND", "USD");

    // Regex pattern for order number extraction
    // Matches: ORD-XXXXX-XXXX or ORD202501XXXX with word boundaries
    private static final Pattern ORDER_PATTERN = Pattern.compile("\\b(ORD[-]?[A-Z0-9-]+)\\b", Pattern.CASE_INSENSITIVE);

    private final SepayGatewayProperties properties;
    private final RestTemplate restTemplate;

    // Cache for pending payments (orderNumber -> payment info)
    private final ConcurrentHashMap<String, PendingPayment> pendingPayments = new ConcurrentHashMap<>();

    // Scheduler for cleaning up expired pending payments (avoid memory leak)
    private final ScheduledExecutorService cleanupScheduler = Executors.newSingleThreadScheduledExecutor();

    public SepayGateway(SepayGatewayProperties properties) {
        this.properties = properties;

        // Configure RestTemplate with timeouts to prevent thread exhaustion
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofMillis(properties.getConnectTimeoutMs()));
        factory.setReadTimeout(Duration.ofMillis(properties.getReadTimeoutMs()));
        this.restTemplate = new RestTemplate(factory);

        log.info("[SEPAY] Gateway initialized with bank: {} - {}, account: {}, timeouts: connect={}ms, read={}ms",
                properties.getBankCode(),
                properties.getAccountName(),
                maskAccountNumber(properties.getBankAccount()),
                properties.getConnectTimeoutMs(),
                properties.getReadTimeoutMs());
    }

    /**
     * Start the cleanup scheduler after bean initialization.
     * Cleans up expired pending payments every 5 minutes to prevent memory leak.
     */
    @PostConstruct
    public void startCleanupScheduler() {
        cleanupScheduler.scheduleAtFixedRate(this::cleanupExpiredPayments, 5, 5, TimeUnit.MINUTES);
        log.info("[SEPAY] Started pending payment cleanup scheduler (every 5 minutes)");
    }

    /**
     * Shutdown the cleanup scheduler on bean destruction.
     */
    @PreDestroy
    public void stopCleanupScheduler() {
        cleanupScheduler.shutdown();
        try {
            if (!cleanupScheduler.awaitTermination(5, TimeUnit.SECONDS)) {
                cleanupScheduler.shutdownNow();
            }
        } catch (InterruptedException e) {
            cleanupScheduler.shutdownNow();
            Thread.currentThread().interrupt();
        }
        log.info("[SEPAY] Stopped pending payment cleanup scheduler");
    }

    /**
     * Clean up expired pending payments to prevent memory leak.
     */
    private void cleanupExpiredPayments() {
        LocalDateTime now = LocalDateTime.now();
        int removedCount = 0;

        Iterator<Map.Entry<String, PendingPayment>> iterator = pendingPayments.entrySet().iterator();
        while (iterator.hasNext()) {
            Map.Entry<String, PendingPayment> entry = iterator.next();
            if (entry.getValue().expiresAt().isBefore(now)) {
                iterator.remove();
                removedCount++;
                log.debug("[SEPAY] Cleaned up expired pending payment for order: {}", entry.getKey());
            }
        }

        if (removedCount > 0) {
            log.info("[SEPAY] Cleaned up {} expired pending payments. Remaining: {}",
                    removedCount, pendingPayments.size());
        }
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
            // Use provided exchange rate, or from config, or fallback default
            exchangeRate = request.getExchangeRate() != null
                    ? request.getExchangeRate()
                    : properties.getUsdToVndRate();
            amountVnd = request.getAmount().multiply(exchangeRate);
            log.info("[SEPAY] Converted {} USD to {} VND (rate: {} from {})",
                    request.getAmount(), amountVnd.longValue(), exchangeRate,
                    request.getExchangeRate() != null ? "request" : "config");
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
     *
     * Note: UriComponentsBuilder handles URL encoding automatically via encode().
     * Do NOT manually encode content before passing to queryParam() to avoid double-encoding.
     */
    private String buildQrCodeUrl(long amount, String content) {
        // SePay QR endpoint is at qr.sepay.vn, not my.sepay.vn
        String qrBaseUrl = "https://qr.sepay.vn";

        // Let UriComponentsBuilder handle URL encoding via encode()
        // Do NOT manually URLEncoder.encode() - that would cause double-encoding
        return UriComponentsBuilder
                .fromUriString(qrBaseUrl)
                .path("/img")
                .queryParam("bank", properties.getBankCode())
                .queryParam("acc", properties.getBankAccount())
                .queryParam("template", properties.getTemplate())
                .queryParam("amount", amount)
                .queryParam("des", content)  // Raw content - will be encoded by encode()
                .encode()  // Properly encodes all query parameters
                .toUriString();
    }

    /**
     * Generate transfer content that includes order number.
     * This content will appear in the bank statement and is used to match webhooks.
     *
     * IMPORTANT: Banks typically truncate transfer content at 50-70 characters.
     * Keep the content short to ensure the order number is not cut off.
     *
     * @param orderNumber The order number to include in the transfer content
     * @return Transfer content string, guaranteed to be under max length
     */
    private String generateTransferContent(String orderNumber) {
        String prefix = properties.getTransferContentPrefix();
        String content = prefix + " " + orderNumber;

        // Ensure content doesn't exceed max length (default 50 chars)
        int maxLength = properties.getMaxTransferContentLength();
        if (content.length() > maxLength) {
            // Truncate order number but keep prefix and enough of the order ID to match
            int availableForOrder = maxLength - prefix.length() - 1; // -1 for space
            if (availableForOrder > 10) {
                // Keep at least the unique part of the order number
                content = prefix + " " + orderNumber.substring(0, Math.min(orderNumber.length(), availableForOrder));
                log.warn("[SEPAY] Transfer content truncated from {} to {} chars for order {}",
                        (prefix + " " + orderNumber).length(), content.length(), orderNumber);
            }
        }

        return content;
    }

    /**
     * Generate a unique transaction ID.
     */
    private String generateTransactionId(String orderNumber) {
        return "SEPAY_" + orderNumber + "_" + System.currentTimeMillis();
    }

    /**
     * Capture payment - Not applicable for SePay
     *
     * <p><b>SePay Payment Flow:</b></p>
     * <ol>
     *   <li>User scans QR code and initiates bank transfer</li>
     *   <li>SePay detects the transfer and sends webhook notification</li>
     *   <li>Webhook handler processes and completes the order</li>
     * </ol>
     *
     * <p>Unlike PayPal (which uses authorize → capture flow), SePay uses immediate
     * bank transfers confirmed via webhook. There is no separate "capture" step.</p>
     *
     * <p>This method is implemented for API compatibility and performs a status check
     * instead of an actual capture operation.</p>
     *
     * @param gatewayTransactionId The SePay transaction ID to check
     * @return Payment status result (not an actual capture result)
     */
    @Override
    public GatewayPaymentResult capturePayment(String gatewayTransactionId) {
        log.debug("[SEPAY] capturePayment called for: {} - SePay uses webhook confirmation, performing status check instead",
                gatewayTransactionId);

        // SePay uses immediate bank transfer - no capture step needed
        // Returning status check for API compatibility with other gateways
        return checkTransactionStatus(gatewayTransactionId);
    }

    /**
     * Check transaction status by querying SePay API.
     * Note: This method does NOT remove from pendingPayments to avoid race condition.
     * Only webhook handler should remove pending payments atomically.
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
            // Payment might have been processed by webhook or never existed
            // Return UNKNOWN status - caller should check order status in database
            return GatewayPaymentResult.builder()
                    .success(false)
                    .status(GatewayResultStatus.UNKNOWN)
                    .gatewayTransactionId(gatewayTransactionId)
                    .gatewayName(GATEWAY_NAME)
                    .errorCode("PAYMENT_NOT_TRACKED")
                    .errorMessage("Payment not found in pending queue. Check order status directly.")
                    .build();
        }

        // Check if expired
        if (pending.expiresAt().isBefore(LocalDateTime.now())) {
            // Remove expired payment atomically
            if (pendingPayments.remove(orderNumber, pending)) {
                log.info("[SEPAY] Expired payment removed for order: {}", orderNumber);
            }
            return GatewayPaymentResult.builder()
                    .success(false)
                    .status(GatewayResultStatus.EXPIRED)
                    .gatewayTransactionId(gatewayTransactionId)
                    .gatewayName(GATEWAY_NAME)
                    .errorCode("PAYMENT_EXPIRED")
                    .errorMessage("Payment QR code has expired. Please start a new checkout.")
                    .build();
        }

        // Query SePay API for transaction (read-only check, don't remove from pending)
        try {
            SepayTransactionResponse response = queryTransactions(orderNumber);
            if (response != null && response.getTransactions() != null) {
                for (SepayTransactionResponse.SepayTransaction txn : response.getTransactions()) {
                    // Check if this transaction matches our order
                    if (matchesOrder(txn, pending)) {
                        // Found matching transaction! Remove atomically to claim it
                        if (pendingPayments.remove(orderNumber, pending)) {
                            log.info("[SEPAY] Found matching transaction for order {} via status check", orderNumber);
                            return GatewayPaymentResult.success(
                                    txn.getId(),
                                    GATEWAY_NAME,
                                    BigDecimal.valueOf(txn.getAmountIn()),
                                    "VND"
                            );
                        } else {
                            // Another thread (webhook) already processed it
                            log.info("[SEPAY] Transaction for order {} was processed by another thread", orderNumber);
                            return GatewayPaymentResult.builder()
                                    .success(false)
                                    .status(GatewayResultStatus.UNKNOWN)
                                    .gatewayTransactionId(gatewayTransactionId)
                                    .gatewayName(GATEWAY_NAME)
                                    .errorCode("CONCURRENT_PROCESSING")
                                    .errorMessage("Payment was processed by webhook. Check order status.")
                                    .build();
                        }
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

            // Use configurable limit
            String url = properties.getBaseUrl() + "/userapi/transactions/list"
                    + "?account_number=" + properties.getBankAccount()
                    + "&limit=" + properties.getTransactionQueryLimit();

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
     * Returns UNKNOWN if payment is not tracked (caller should check database).
     */
    @Override
    public GatewayPaymentStatus getPaymentStatus(String gatewayTransactionId) {
        log.debug("[SEPAY] Checking status for transaction: {}", gatewayTransactionId);

        String orderNumber = extractOrderNumber(gatewayTransactionId);
        PendingPayment pending = pendingPayments.get(orderNumber);

        if (pending == null) {
            // Payment not found in pending queue - could mean:
            // 1. Payment was completed via webhook
            // 2. Payment was never created
            // 3. Server restarted and lost state
            // Return UNKNOWN - caller should check order status in database
            return GatewayPaymentStatus.builder()
                    .gatewayTransactionId(gatewayTransactionId)
                    .gatewayName(GATEWAY_NAME)
                    .status(GatewayResultStatus.UNKNOWN)
                    .errorCode("PAYMENT_NOT_TRACKED")
                    .errorMessage("Payment status cannot be determined from gateway. Check order status directly.")
                    .build();
        }

        // Check if expired
        if (pending.expiresAt().isBefore(LocalDateTime.now())) {
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
     * Uses atomic remove to prevent race condition with status check.
     * Strictly validates amount to prevent underpayment attacks.
     *
     * @param payload The webhook payload from SePay
     * @return WebhookResult indicating success/failure and order details
     */
    public WebhookResult handleWebhook(SepayWebhookPayload payload) {
        log.info("[SEPAY] Processing webhook: id={}, code={}, amount={}, content={}, accountNumber={}",
                payload.getId(), payload.getCode(), payload.getTransferAmount(),
                payload.getContent(), payload.getAccountNumber());

        // Validate account number matches our configured account
        if (properties.getBankAccount() != null &&
                !properties.getBankAccount().equals(payload.getAccountNumber())) {
            log.error("[SEPAY] SECURITY: Account number mismatch! Expected: {}, Got: {}",
                    maskAccountNumber(properties.getBankAccount()),
                    maskAccountNumber(payload.getAccountNumber()));
            return new WebhookResult(false, null, "Invalid account number");
        }

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

        // Use atomic remove to prevent race condition with status check
        // This ensures only one thread can process this payment
        PendingPayment pending = pendingPayments.remove(orderNumber);
        if (pending == null) {
            log.warn("[SEPAY] No pending payment found for order: {} (may already be processed)", orderNumber);
            return new WebhookResult(false, orderNumber, "No pending payment found or already processed");
        }

        // Strictly validate amount to prevent underpayment attacks
        long expectedAmount = pending.amountVnd();
        long actualAmount = payload.getTransferAmount() != null ? payload.getTransferAmount() : 0;
        long amountDifference = actualAmount - expectedAmount;
        long maxVariance = properties.getMaxAmountVarianceVnd();

        if (amountDifference < -maxVariance) {
            // Underpayment beyond tolerance - REJECT
            log.error("[SEPAY] PAYMENT REJECTED - Underpayment for order {}: expected={}, actual={}, diff={}, maxVariance={}",
                    orderNumber, expectedAmount, actualAmount, amountDifference, maxVariance);
            // Put back in pending so user can try again with correct amount
            pendingPayments.put(orderNumber, pending);
            return new WebhookResult(false, orderNumber,
                    "Insufficient payment amount. Expected: " + expectedAmount + " VND, Received: " + actualAmount + " VND");
        }

        if (Math.abs(amountDifference) > maxVariance) {
            // Overpayment or significant variance - accept but log warning
            log.warn("[SEPAY] Amount variance for order {}: expected={}, actual={}, diff={}, maxVariance={}",
                    orderNumber, expectedAmount, actualAmount, amountDifference, maxVariance);
        }

        log.info("[SEPAY] Payment confirmed for order: {}, amount: {} VND (expected: {}), sepay_id: {}",
                orderNumber, actualAmount, expectedAmount, payload.getId());

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
     * Find order number pattern in text using regex with word boundaries.
     * Matches: ORD-XXXXXX-XXXX or ORD202501XXXX
     *
     * Uses proper word boundaries to avoid false matches like "EDUMIND ORDINARY"
     * matching the "ORD" prefix incorrectly.
     */
    private String findOrderPattern(String text) {
        if (text == null || text.isEmpty()) {
            return null;
        }

        // Use compiled regex pattern with word boundaries for accurate matching
        Matcher matcher = ORDER_PATTERN.matcher(text);
        if (matcher.find()) {
            String matched = matcher.group(1).toUpperCase();
            // Validate that it's a proper order number (at least ORD + some identifier)
            if (matched.length() > 3) {
                return matched;
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
