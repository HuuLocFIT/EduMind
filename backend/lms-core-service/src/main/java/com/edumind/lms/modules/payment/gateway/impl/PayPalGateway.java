package com.edumind.lms.modules.payment.gateway.impl;

import com.edumind.lms.modules.payment.gateway.*;
import com.paypal.core.PayPalEnvironment;
import com.paypal.core.PayPalHttpClient;
import com.paypal.http.HttpResponse;
import com.paypal.http.exceptions.HttpException;
import com.paypal.orders.*;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;

/**
 * PayPal Payment Gateway implementation using PayPal Checkout SDK.
 */
@Slf4j
@Component
@ConditionalOnProperty(name = "payment.paypal.enabled", havingValue = "true", matchIfMissing = false)
public class PayPalGateway implements PaymentGateway {

    private static final String GATEWAY_NAME = "PAYPAL";
    private static final Set<String> SUPPORTED_CURRENCIES = Set.of(
            "USD", "EUR", "GBP", "CAD", "AUD", "JPY", "SGD"
            // Note: VND is not directly supported by PayPal for international transactions usually,
            // requires handling via exchange rates if the app uses VND.
    );

    private final PayPalGatewayProperties properties;
    private final PayPalHttpClient payPalClient;

    public PayPalGateway(PayPalGatewayProperties properties) {
        this.properties = properties;

        PayPalEnvironment environment;
        if ("live".equalsIgnoreCase(properties.getMode())) {
            environment = new PayPalEnvironment.Live(properties.getClientId(), properties.getClientSecret());
        } else {
            environment = new PayPalEnvironment.Sandbox(properties.getClientId(), properties.getClientSecret());
        }

        this.payPalClient = new PayPalHttpClient(environment);
        log.info("[PAYPAL] Gateway initialized in {} mode with clientId: ...{}",
                properties.getMode(),
                properties.getClientId().length() > 5 ? properties.getClientId().substring(properties.getClientId().length() - 5) : "short");
    }

    /**
     * Step 1: Create an Order in PayPal to get an approval link.
     */
    @Override
    public GatewayPaymentResult processPayment(GatewayPaymentRequest request) {
        log.info("[PAYPAL] Creating order for request: {}, amount: {} {}",
                request.getOrderNumber(), request.getAmount(), request.getCurrency());

        // Validate currency is supported
        if (!supportsCurrency(request.getCurrency())) {
            log.warn("[PAYPAL] Currency {} not supported", request.getCurrency());
            return GatewayPaymentResult.failed(GATEWAY_NAME, "CURRENCY_NOT_SUPPORTED",
                    "PayPal does not support " + request.getCurrency() + ". Please use a different payment method.");
        }

        // Validate return URLs are provided
        if (request.getSuccessUrl() == null || request.getCancelUrl() == null) {
            log.error("[PAYPAL] Missing return URLs for order {}", request.getOrderNumber());
            return GatewayPaymentResult.failed(GATEWAY_NAME, "MISSING_RETURN_URLS",
                    "Payment configuration error. Please contact support.");
        }

        OrderRequest orderRequest = new OrderRequest();
        orderRequest.checkoutPaymentIntent("CAPTURE");

        // Application Context (Return/Cancel URLs)
        ApplicationContext applicationContext = new ApplicationContext()
                .brandName("EduMind LMS")
                .landingPage("LOGIN")
                .userAction("PAY_NOW")
                .returnUrl(request.getSuccessUrl())
                .cancelUrl(request.getCancelUrl());
        orderRequest.applicationContext(applicationContext);

        // Purchase Unit
        List<PurchaseUnitRequest> purchaseUnits = new ArrayList<>();
        PurchaseUnitRequest purchaseUnit = new PurchaseUnitRequest()
                .referenceId(request.getOrderNumber())
                .customId(request.getOrderNumber())  // custom_id is passed through to capture webhooks
                .description("Payment for Order " + request.getOrderNumber())
                .amountWithBreakdown(new AmountWithBreakdown()
                        .currencyCode(request.getCurrency())
                        .value(request.getAmount().toPlainString())
                );
        purchaseUnits.add(purchaseUnit);
        orderRequest.purchaseUnits(purchaseUnits);

        OrdersCreateRequest createRequest = new OrdersCreateRequest().requestBody(orderRequest);

        try {
            HttpResponse<Order> response = payPalClient.execute(createRequest);
            Order order = response.result();

            log.info("[PAYPAL] Order created successfully. ID: {}, Status: {}", order.id(), order.status());

            // Extract Approval URL
            String approveUrl = order.links().stream()
                    .filter(link -> "approve".equals(link.rel()))
                    .map(LinkDescription::href)
                    .findFirst()
                    .orElseThrow(() -> new IllegalStateException("No approval link found in PayPal response"));

            return GatewayPaymentResult.requiresAction(
                    order.id(),
                    GATEWAY_NAME,
                    approveUrl
            );

        } catch (HttpException e) {
            log.error("[PAYPAL] Create Order failed with HTTP error: {}", e.getMessage());
            return GatewayPaymentResult.failed(GATEWAY_NAME, "PAYPAL_CREATE_ERROR",
                    "Failed to create payment. Please try again.");
        } catch (IOException e) {
            log.error("[PAYPAL] Create Order failed", e);
            return GatewayPaymentResult.failed(GATEWAY_NAME, "PAYPAL_CREATE_ERROR",
                    "Payment service unavailable. Please try again later.");
        }
    }

    /**
     * Step 2: Capture the payment after user approves (called by Frontend via Backend).
     */
    @Override
    public GatewayPaymentResult capturePayment(String gatewayTransactionId) {
        log.info("[PAYPAL] Capturing payment for Order ID: {}", gatewayTransactionId);

        // First, check if order is in APPROVED status before attempting capture
        try {
            OrdersGetRequest getRequest = new OrdersGetRequest(gatewayTransactionId);
            HttpResponse<Order> getResponse = payPalClient.execute(getRequest);
            Order orderStatus = getResponse.result();

            String currentStatus = orderStatus.status();
            log.info("[PAYPAL] Order {} current status: {}", gatewayTransactionId, currentStatus);

            // If already completed, treat as idempotent success
            if ("COMPLETED".equals(currentStatus)) {
                log.info("[PAYPAL] Order {} already COMPLETED, returning success", gatewayTransactionId);
                return extractCaptureResult(orderStatus);
            }

            // If not approved, user hasn't completed PayPal authorization
            if (!"APPROVED".equals(currentStatus)) {
                String errorMsg = mapStatusToUserMessage(currentStatus);
                return GatewayPaymentResult.failed(GATEWAY_NAME, "ORDER_NOT_APPROVED", errorMsg);
            }
        } catch (IOException e) {
            log.error("[PAYPAL] Failed to check order status for {}: {}", gatewayTransactionId, e.getMessage());
            // Continue with capture attempt - let PayPal return the actual error
        }

        // Proceed with capture
        OrdersCaptureRequest captureRequest = new OrdersCaptureRequest(gatewayTransactionId);

        try {
            HttpResponse<Order> response = payPalClient.execute(captureRequest);
            Order order = response.result();

            log.info("[PAYPAL] Capture response for Order ID: {}. Status: {}", order.id(), order.status());

            if ("COMPLETED".equals(order.status())) {
                return extractCaptureResult(order);
            } else {
                return GatewayPaymentResult.failed(GATEWAY_NAME, "PAYPAL_NOT_COMPLETED",
                        "Payment capture incomplete. Status: " + order.status());
            }

        } catch (HttpException e) {
            return handlePayPalHttpException(e, gatewayTransactionId);
        } catch (IOException e) {
            log.error("[PAYPAL] Capture failed for Order ID: {}", gatewayTransactionId, e);
            return GatewayPaymentResult.failed(GATEWAY_NAME, "PAYPAL_CAPTURE_ERROR",
                    "Payment capture failed. Please try again or contact support.");
        }
    }

    /**
     * Extract capture result including the actual Capture ID (needed for refunds).
     */
    private GatewayPaymentResult extractCaptureResult(Order order) {
        PurchaseUnit purchaseUnit = order.purchaseUnits().get(0);

        String currency = null;
        String value = null;
        String captureId = order.id(); // Fallback to order ID

        // Extract the actual Capture ID and amount from payments.captures
        // This is CRITICAL for refunds - PayPal refunds require the Capture ID, not the Order ID
        if (purchaseUnit.payments() != null &&
            purchaseUnit.payments().captures() != null &&
            !purchaseUnit.payments().captures().isEmpty()) {

            Capture capture = purchaseUnit.payments().captures().get(0);
            captureId = capture.id();

            // Get amount from capture (more reliable than purchaseUnit.amountWithBreakdown)
            if (capture.amount() != null) {
                currency = capture.amount().currencyCode();
                value = capture.amount().value();
            }
            log.info("[PAYPAL] Extracted Capture ID: {} for Order ID: {}, amount: {} {}",
                    captureId, order.id(), value, currency);
        } else {
            log.warn("[PAYPAL] Could not extract Capture ID, using Order ID as fallback: {}", order.id());
        }

        // Fallback to purchaseUnit.amountWithBreakdown if capture amount not available
        if (currency == null && purchaseUnit.amountWithBreakdown() != null) {
            currency = purchaseUnit.amountWithBreakdown().currencyCode();
            value = purchaseUnit.amountWithBreakdown().value();
        }

        // Final fallback - use defaults if still null
        if (currency == null) {
            log.warn("[PAYPAL] Could not extract amount from PayPal response for Order ID: {}", order.id());
            currency = "USD";
            value = "0";
        }

        return GatewayPaymentResult.success(
                captureId,      // Use Capture ID for refunds
                GATEWAY_NAME,
                new BigDecimal(value),
                currency
        );
    }

    /**
     * Handle PayPal HTTP exceptions with specific error messages.
     */
    private GatewayPaymentResult handlePayPalHttpException(HttpException e, String orderId) {
        String errorBody = e.getMessage();
        log.error("[PAYPAL] HTTP error for Order ID {}: {}", orderId, errorBody);

        // Handle specific PayPal error codes
        if (errorBody != null) {
            if (errorBody.contains("ORDER_ALREADY_CAPTURED")) {
                log.info("[PAYPAL] Order {} was already captured, treating as success", orderId);
                // Fetch the order to get the capture details
                try {
                    return getPaymentStatusAsResult(orderId);
                } catch (Exception ex) {
                    // If we can't fetch, still return success since PayPal confirmed it was captured
                    return GatewayPaymentResult.builder()
                            .success(true)
                            .status(GatewayResultStatus.SUCCESS)
                            .gatewayTransactionId(orderId)
                            .gatewayName(GATEWAY_NAME)
                            .build();
                }
            }
            if (errorBody.contains("INSTRUMENT_DECLINED")) {
                return GatewayPaymentResult.failed(GATEWAY_NAME, "INSTRUMENT_DECLINED",
                        "Your payment method was declined. Please try a different payment method.");
            }
            if (errorBody.contains("PAYER_ACTION_REQUIRED")) {
                return GatewayPaymentResult.failed(GATEWAY_NAME, "PAYER_ACTION_REQUIRED",
                        "Additional action required. Please complete the payment on PayPal.");
            }
            if (errorBody.contains("ORDER_NOT_APPROVED")) {
                return GatewayPaymentResult.failed(GATEWAY_NAME, "ORDER_NOT_APPROVED",
                        "Payment not approved. Please authorize the payment on PayPal first.");
            }
            if (errorBody.contains("INVALID_RESOURCE_ID")) {
                return GatewayPaymentResult.failed(GATEWAY_NAME, "INVALID_RESOURCE_ID",
                        "Payment session expired or invalid. Please start a new checkout.");
            }
        }

        return GatewayPaymentResult.failed(GATEWAY_NAME, "PAYPAL_CAPTURE_ERROR",
                "Payment capture failed. Please try again or contact support.");
    }

    /**
     * Get payment status and convert to result (for already captured orders).
     */
    private GatewayPaymentResult getPaymentStatusAsResult(String orderId) throws IOException {
        OrdersGetRequest getRequest = new OrdersGetRequest(orderId);
        HttpResponse<Order> response = payPalClient.execute(getRequest);
        Order order = response.result();

        if ("COMPLETED".equals(order.status())) {
            return extractCaptureResult(order);
        }

        return GatewayPaymentResult.failed(GATEWAY_NAME, "PAYPAL_STATUS_ERROR",
                "Could not verify payment status");
    }

    /**
     * Map PayPal order status to user-friendly message.
     */
    private String mapStatusToUserMessage(String status) {
        return switch (status) {
            case "CREATED" -> "Payment not yet authorized. Please complete the payment on PayPal.";
            case "SAVED" -> "Payment saved but not completed. Please complete the payment on PayPal.";
            case "VOIDED" -> "Payment was cancelled or voided.";
            case "PAYER_ACTION_REQUIRED" -> "Additional action required. Please check your PayPal account.";
            default -> "Payment not ready for capture. Current status: " + status;
        };
    }

    @Override
    public GatewayRefundResult refund(String gatewayTransactionId, BigDecimal amount, String currency) {
        log.info("[PAYPAL] Processing refund for Capture ID: {}, amount: {} {}",
                gatewayTransactionId, amount, currency);

        // Note: gatewayTransactionId should be the CAPTURE ID, not Order ID
        // This is returned from capturePayment() after successful capture
        com.paypal.payments.CapturesRefundRequest request = new com.paypal.payments.CapturesRefundRequest(gatewayTransactionId);
        request.prefer("return=representation");

        com.paypal.payments.RefundRequest refundRequest = new com.paypal.payments.RefundRequest();
        refundRequest.amount(new com.paypal.payments.Money()
                .currencyCode(currency)
                .value(amount.toPlainString()));
        request.requestBody(refundRequest);

        try {
            HttpResponse<com.paypal.payments.Refund> response = payPalClient.execute(request);
            com.paypal.payments.Refund refund = response.result();

            log.info("[PAYPAL] Refund successful. Refund ID: {}, Status: {}", refund.id(), refund.status());

            return GatewayRefundResult.success(
                    refund.id(),
                    gatewayTransactionId,
                    GATEWAY_NAME,
                    new BigDecimal(refund.sellerPayableBreakdown().totalRefundedAmount().value()),
                    refund.sellerPayableBreakdown().totalRefundedAmount().currencyCode()
            );

        } catch (HttpException e) {
            log.error("[PAYPAL] Refund HTTP error for Capture ID {}: {}", gatewayTransactionId, e.getMessage());
            String errorMsg = "Refund failed.";
            if (e.getMessage() != null && e.getMessage().contains("INVALID_RESOURCE_ID")) {
                errorMsg = "Invalid capture ID. Please ensure you're using the correct transaction reference.";
            }
            return GatewayRefundResult.failed(
                    gatewayTransactionId,
                    GATEWAY_NAME,
                    "PAYPAL_REFUND_ERROR",
                    errorMsg
            );
        } catch (IOException e) {
            log.error("[PAYPAL] Refund failed for Capture ID: {}", gatewayTransactionId, e);
            return GatewayRefundResult.failed(
                    gatewayTransactionId,
                    GATEWAY_NAME,
                    "PAYPAL_REFUND_ERROR",
                    "Refund service unavailable. Please try again later."
            );
        }
    }

    @Override
    public GatewayPaymentStatus getPaymentStatus(String gatewayTransactionId) {
        log.debug("[PAYPAL] Checking status for Order ID: {}", gatewayTransactionId);

        OrdersGetRequest getRequest = new OrdersGetRequest(gatewayTransactionId);
        try {
            HttpResponse<Order> response = payPalClient.execute(getRequest);
            Order order = response.result();

            GatewayResultStatus status = switch (order.status()) {
                case "COMPLETED" -> GatewayResultStatus.SUCCESS;
                case "APPROVED" -> GatewayResultStatus.PENDING; // Needs capture
                case "VOIDED" -> GatewayResultStatus.FAILED;
                default -> GatewayResultStatus.PENDING;
            };

            return GatewayPaymentStatus.builder()
                    .gatewayTransactionId(gatewayTransactionId)
                    .gatewayName(GATEWAY_NAME)
                    .status(status)
                    .build();

        } catch (IOException e) {
            log.error("[PAYPAL] Get Status failed for Order ID: {}", gatewayTransactionId, e);
            return GatewayPaymentStatus.builder()
                    .gatewayTransactionId(gatewayTransactionId)
                    .gatewayName(GATEWAY_NAME)
                    .status(GatewayResultStatus.FAILED)
                    .errorCode("PAYPAL_STATUS_ERROR")
                    .errorMessage("Failed to check payment status")
                    .build();
        }
    }

    @Override
    public String getGatewayName() {
        return GATEWAY_NAME;
    }

    @Override
    public boolean supportsCurrency(String currency) {
        if (currency == null) return false;
        return SUPPORTED_CURRENCIES.contains(currency.toUpperCase());
    }
}
