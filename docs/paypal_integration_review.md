# PayPal Integration Code Review

This document contains findings from reviewing the PayPal integration implementation against the `paypal_integration_guide.md`.

## Summary

| Category | Original | Fixed |
|----------|----------|-------|
| Critical Issues | 2 | 2 |
| Missing Edge Cases | 6 | 5 (webhook excluded) |
| Minor Issues | 3 | 2 |

---

## Fixed Issues

### 1. ✅ FIXED: Capture ID vs Order ID for Refunds

**Location:** `PayPalGateway.java:117-180`

**Fix Applied:**
- Added `extractCaptureResult()` method that extracts the actual Capture ID from `order.purchaseUnits().get(0).payments().captures().get(0).id()`
- The Capture ID is now returned as `gatewayTransactionId` for use in refunds
- Falls back to Order ID if captures list is not available (with warning log)

```java
private GatewayPaymentResult extractCaptureResult(Order order) {
    // Extract the actual Capture ID from payments.captures
    String captureId = order.id(); // Fallback
    if (purchaseUnit.payments() != null &&
        purchaseUnit.payments().captures() != null &&
        !purchaseUnit.payments().captures().isEmpty()) {
        captureId = purchaseUnit.payments().captures().get(0).id();
    }
    return GatewayPaymentResult.success(captureId, ...);
}
```

---

### 2. ✅ FIXED: Missing Success/Cancel URLs in Gateway Request

**Location:** `CheckoutServiceImpl.java:798-830`

**Fix Applied:**
- Added `PayPalGatewayProperties` dependency to `CheckoutServiceImpl`
- Updated `prepareGatewayRequest()` to set `successUrl` and `cancelUrl`
- Uses URLs from request if provided, otherwise constructs defaults from config

```java
private GatewayPaymentRequest prepareGatewayRequest(Order order, CheckoutRequest request) {
    String successUrl = request.getSuccessUrl();
    String cancelUrl = request.getCancelUrl();

    if (successUrl == null || successUrl.isBlank()) {
        String baseUrl = payPalGatewayProperties.getReturnBaseUrl();
        successUrl = baseUrl + "/checkout/success?orderId=" + order.getId();
    }
    // ... similar for cancelUrl

    return GatewayPaymentRequest.builder()
            // ...
            .successUrl(successUrl)
            .cancelUrl(cancelUrl)
            .build();
}
```

**Config Added to `PayPalGatewayProperties`:**
```java
private String returnBaseUrl = "http://localhost:3000";
```

---

### 3. ✅ FIXED: No User Cancellation Handling

**Location:** `CheckoutController.java` and `CheckoutServiceImpl.java`

**Fix Applied:**
- Added `POST /checkout/cancel?orderId=...` endpoint
- Added `handlePaymentCancellation(Long userId, Long orderId)` method
- Resets order to `PENDING` status so user can retry
- Marks pending transaction as `FAILED` with reason `USER_CANCELLED`
- Returns `canRetry: true` in response

---

### 4. ✅ FIXED: No Order Status Verification Before Capture

**Location:** `PayPalGateway.java:117-150`

**Fix Applied:**
- Added pre-capture status check using `OrdersGetRequest`
- If status is `COMPLETED`, treats as idempotent success
- If status is not `APPROVED`, returns user-friendly error message
- Added `mapStatusToUserMessage()` helper for clear error messages

---

### 5. ✅ FIXED: Race Condition in `capturePayment`

**Location:** `TransactionRepository.java` and `CheckoutServiceImpl.java`

**Fix Applied:**
- Added `findByGatewayTransactionIdForUpdate()` with `@Lock(LockModeType.PESSIMISTIC_WRITE)`
- Updated `capturePayment()` to use this method for atomic read-lock
- Added order status validation before gateway call

---

### 6. ✅ FIXED: VND Currency Not Supported

**Location:** `PayPalGateway.java:56-60`

**Fix Applied:**
- Added currency validation in `processPayment()` before calling PayPal API
- Returns clear error message if unsupported currency is used

```java
if (!supportsCurrency(request.getCurrency())) {
    return GatewayPaymentResult.failed(GATEWAY_NAME, "CURRENCY_NOT_SUPPORTED",
            "PayPal does not support " + request.getCurrency() + ". Please use a different payment method.");
}
```

---

### 7. ✅ FIXED: No Duplicate Capture Protection (Idempotency)

**Location:** `PayPalGateway.java:85-105`

**Fix Applied:**
- Added handling for `ORDER_ALREADY_CAPTURED` error in `handlePayPalHttpException()`
- When detected, fetches order status and returns success result
- Also handles pre-capture check for `COMPLETED` status

---

### 8. ✅ FIXED: No PayPal-Specific Error Code Handling

**Location:** `PayPalGateway.java:145-175`

**Fix Applied:**
- Added `handlePayPalHttpException()` method
- Maps specific PayPal errors to user-friendly messages:
  - `INSTRUMENT_DECLINED` → "Your payment method was declined..."
  - `PAYER_ACTION_REQUIRED` → "Additional action required..."
  - `ORDER_NOT_APPROVED` → "Payment not approved..."
  - `INVALID_RESOURCE_ID` → "Payment session expired..."

---

### 9. ✅ FIXED: Emoji in Logs

**Location:** `PayPalGateway.java` (all methods)

**Fix Applied:**
- Replaced all emoji logs with standard `[PAYPAL]` prefix
- Example: `log.info("[PAYPAL] Order created successfully...")`

---

## Remaining Items (Not Fixed)

### ⚠️ No PayPal Webhook/IPN Support (Excluded per request)

**Problem:** If user closes browser after approving but before redirect completes, the capture never happens.

**Status:** Not implemented as deployment is not ready.

**Recommendation for future:** Implement PayPal webhooks for:
- `CHECKOUT.ORDER.APPROVED`
- `PAYMENT.CAPTURE.COMPLETED`
- `PAYMENT.CAPTURE.DENIED`

---

### ℹ️ Unused `webhookUrl` Field

**Location:** `GatewayPaymentRequest.java:47`

**Status:** Not removed (may be needed for webhook implementation)

---

## Files Changed

### Backend

| File | Changes |
|------|---------|
| `PayPalGatewayProperties.java` | Added `returnBaseUrl` field |
| `PayPalGateway.java` | Major refactor: capture ID extraction, error handling, status checks, removed emojis |
| `TransactionRepository.java` | Added `findByGatewayTransactionIdForUpdate()` with pessimistic lock |
| `CheckoutService.java` | Added `handlePaymentCancellation()` method |
| `CheckoutServiceImpl.java` | Added PayPal properties, fixed prepareGatewayRequest(), added cancellation handling, improved capturePayment() |
| `CheckoutController.java` | Added `POST /checkout/cancel` endpoint |
| `CheckoutResultResponse.java` | Added `canRetry` field |

### Frontend

| File | Changes |
|------|---------|
| `api-endpoints.ts` | Added `CAPTURE` and `CANCEL` endpoints |
| `checkout.service.ts` | Added `capturePayment()` and `cancelPayment()` methods |
| `useCheckout.ts` | Added `useCapturePayment` and `useCancelPayment` hooks |
| `CheckoutSuccessPage.tsx` | Added PayPal capture flow - detects `token` param, calls capture API, shows loading/error states |
| `CheckoutFailedPage.tsx` | Added cancellation handling - detects `orderId` param, calls cancel API, shows different UI for cancel vs error |
| `checkout.schemas.ts` | Added `canRetry` field to `CheckoutResultResponseSchema` |

---

## Configuration Required

Add to your `.env` or `application.yml`:

```yaml
payment:
  paypal:
    client-id: ${PAYPAL_CLIENT_ID}
    client-secret: ${PAYPAL_CLIENT_SECRET}
    mode: sandbox  # or live
    return-base-url: http://localhost:3000  # Your frontend URL
```

---

## Testing Checklist

- [ ] Create PayPal order → Verify redirect URL is correct
- [ ] Complete PayPal approval → Verify capture works and returns Capture ID
- [ ] Cancel on PayPal page → Verify `/checkout/cancel` endpoint works
- [ ] Call capture twice → Verify idempotent response
- [ ] Test refund → Verify it uses Capture ID (not Order ID)
- [ ] Test with unsupported currency (VND) → Verify clear error message
- [ ] Test concurrent capture requests → Verify no race condition
