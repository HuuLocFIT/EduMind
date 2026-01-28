# Payment Module Bugs - Analysis & Fixes

This document tracks critical bugs found in the payment module, their root causes, and applied fixes.

---

## Bug #1: Payment Captured But Enrollment Failed (CRITICAL)

**Status:** FIXED
**Severity:** Critical
**Date Found:** 2026-01-28
**File:** `CheckoutServiceImpl.java`

### Symptom
- Database shows transaction status as `FAILED`
- Seller account received money (+money)
- Buyer account was charged (-money)
- Buyer did NOT receive course access
- No automatic refund was issued

### Root Cause
In `finalizePaymentTransaction()` method (lines 1051-1106), when PayPal capture succeeded but `handleSuccessfulPayment()` threw an exception during enrollment:

```java
// BEFORE FIX (problematic code)
if (result.isSuccess()) {
    transaction.setStatus(TransactionStatus.SUCCESS);  // ✓ Transaction marked SUCCESS
    transactionRepository.save(transaction);

    try {
        return handleSuccessfulPayment(order, transaction, isFromCart);
    } catch (Exception e) {
        // Payment already captured at PayPal!
        // But we just mark order as FAILED without refund
        freshOrder.setStatus(OrderStatus.FAILED);  // ✗ No refund attempted
        orderRepository.save(freshOrder);
        return failureResponse;  // ✗ User sees "failed" but money is gone
    }
}
```

**The flow was:**
1. `gateway.capturePayment()` succeeds → Money moves from buyer to seller
2. `transaction.setStatus(SUCCESS)` → Transaction marked as success
3. `handleSuccessfulPayment()` called → Attempts enrollment
4. `enrollmentService.enrollStudent()` throws exception (e.g., course unpublished)
5. Catch block marks order as `FAILED` → **BUG: No refund issued!**

### Fix Applied
Added automatic refund logic in new method `handlePaymentSuccessEnrollmentFailure()`:

```java
// AFTER FIX
} catch (Exception e) {
    log.error("CRITICAL: Payment successful but order completion failed. Attempting auto-refund.");
    return handlePaymentSuccessEnrollmentFailure(order, transaction, e.getMessage());
}
```

**New flow:**
```
Payment Captured → Enrollment Fails →
  ├─ Auto-refund attempted via gateway.refund()
  │   ├─ Refund SUCCESS → Order=REFUNDED, Transaction=REFUNDED
  │   │   └─ User: "Payment refunded automatically. Please try again."
  │   │
  │   └─ Refund FAILED → Order=FAILED with "MANUAL_REFUND_REQUIRED:" prefix
  │       └─ User: "Support notified. Refund within 24-48 hours."
```

### Files Modified
- `CheckoutServiceImpl.java`:
  - Modified `finalizePaymentTransaction()` catch block
  - Added `handlePaymentSuccessEnrollmentFailure()` method
  - Added `markOrderForManualIntervention()` method

### How to Find Affected Orders (Manual Recovery)
```sql
-- Find orders that need manual refund
SELECT o.id, o.order_number, o.user_id, o.total_amount, o.failure_reason,
       t.gateway_transaction_id, t.status as tx_status
FROM payment.orders o
JOIN payment.transactions t ON t.order_id = o.id
WHERE o.status = 'FAILED'
  AND t.status = 'SUCCESS'
  AND o.failure_reason LIKE '%Payment Succeeded but Enrollment Failed%';

-- After fix: find orders marked for manual refund
SELECT * FROM payment.orders
WHERE failure_reason LIKE 'MANUAL_REFUND_REQUIRED:%';
```

---

## Bug #2: Race Condition in Concurrent Checkout (Previously Fixed)

**Status:** Previously Fixed
**Severity:** High
**File:** `CheckoutServiceImpl.java`

### Symptom
Multiple checkout requests for same user could create duplicate orders or double-charge.

### Fix Applied
- Idempotency key support via `request.getIdempotencyKey()`
- Unique constraint on active orders per user
- Optimistic locking with `@Version` on Order entity
- `DataIntegrityViolationException` handling returns "CHECKOUT_IN_PROGRESS"

---

## Bug #3: Order Expiration Not Properly Handled (Previously Fixed)

**Status:** Previously Fixed
**Severity:** Medium
**File:** `CheckoutServiceImpl.java`

### Symptom
Expired orders in `PROCESSING` state blocked new checkout attempts.

### Fix Applied
In `validateProcessingEligibility()`:
- If order is `PROCESSING` but expired, reset to `PENDING`
- Mark pending transactions as `FAILED`
- Extend expiration time for retry

---

## Bug #4: Cart Not Cleared on Retry Payment (Previously Fixed)

**Status:** Previously Fixed
**Severity:** Low
**File:** `CheckoutServiceImpl.java`

### Symptom
When retrying payment for a failed order, user's current cart was incorrectly cleared.

### Fix Applied
In `retryPayment()`:
- Pass `false` for `isFromCart` parameter
- Only clear cart when checkout originates from cart, not on retry

---

## Bug #5: Lazy Loading Exception on Payment Callback (Previously Fixed)

**Status:** Previously Fixed
**Severity:** Medium
**File:** `CheckoutServiceImpl.java`

### Symptom
`LazyInitializationException` or `NullPointerException` when handling payment callbacks.

### Fix Applied
In `handlePaymentCallback()`:
- Explicitly reload order by ID within transaction
- Avoid accessing lazy-loaded associations outside transaction

---

## Bug #6: Stuck PROCESSING Orders Block New Checkouts Forever (CRITICAL)

**Status:** FIXED
**Severity:** Critical
**Date Found:** 2026-01-28
**Files:** `CheckoutServiceImpl.java`, `OrderRepository.java`, `OrderExpirationScheduler.java`

### Symptom
- User starts checkout → redirected to PayPal
- User abandons PayPal page (closes tab, doesn't complete payment)
- Order stays in `PROCESSING` status forever
- User tries to checkout again → gets error: "You already have a checkout in progress"
- User is permanently blocked from making any purchases
- Database shows multiple orders stuck in `PROCESSING` for hours/days

### Root Cause
The order expiration logic in `validateProcessingEligibility()` only runs **AFTER** `createOrderFromCart()` is called. But the unique constraint on active orders (`ux_orders_user_active_status`) causes `createOrderFromCart()` to fail **BEFORE** any expiration check happens.

**Flow (Before Fix):**
```
checkout() method:
1. Check idempotency key
2. createOrderFromCart() ← FAILS HERE with DataIntegrityViolationException
3. Returns generic "CHECKOUT_IN_PROGRESS" error (no order ID!)
4. ❌ Never reaches validateProcessingEligibility() which has expiration logic
```

**Database Constraint:**
```sql
-- V13: Only ONE active order per user allowed
CREATE UNIQUE INDEX ux_orders_user_active_status
ON payment.orders (user_id)
WHERE status IN ('PENDING', 'PROCESSING');
```

### Fix Applied

#### Part 1: Check and expire before creating new order
Added `handleExistingActiveOrder()` method that runs **BEFORE** `createOrderFromCart()`:

```java
// NEW METHOD: handleExistingActiveOrder(userId)
private CheckoutResultResponse handleExistingActiveOrder(Long userId) {
    Optional<Order> existingOrderOpt = orderRepository.findActiveOrderByUserId(userId);

    if (existingOrderOpt.isEmpty()) {
        return null; // No active order, proceed with new checkout
    }

    Order existingOrder = existingOrderOpt.get();
    LocalDateTime now = LocalDateTime.now();

    // Check if the existing order has expired
    if (existingOrder.getExpiresAt() != null && now.isAfter(existingOrder.getExpiresAt())) {
        // Mark expired order as FAILED in a separate transaction
        // ... marks order and transactions as FAILED ...
        return null; // Order expired, proceed with new checkout
    }

    // Order exists and is NOT expired - return it so user can complete or cancel
    return CheckoutResultResponse.builder()
            .success(false)
            .pending(true)
            .orderId(existingOrder.getId())  // ✓ Now includes order ID!
            .orderNumber(existingOrder.getOrderNumber())
            .redirectUrl(existingTransaction.getRedirectUrl())  // ✓ PayPal URL if available
            .message("You have an active checkout in progress. Please complete it or cancel.")
            .errorCode("CHECKOUT_IN_PROGRESS")
            .build();
}
```

**Flow (After Fix):**
```
checkout() method:
1. Check idempotency key
2. handleExistingActiveOrder() ← NEW: Check + expire old orders first
   ├─ No active order → continue
   ├─ Active but EXPIRED → mark as FAILED, continue
   └─ Active and NOT expired → return order info (user can complete/cancel)
3. createOrderFromCart()
4. processPayment()
```

#### Part 2: Scheduled cleanup job
Added `OrderExpirationScheduler` to automatically clean up stuck orders:

```java
@Component
public class OrderExpirationScheduler {

    @Scheduled(fixedRate = 5 * 60 * 1000) // Every 5 minutes
    @Transactional
    public void expireStuckOrders() {
        List<Order> expiredOrders = orderRepository.findExpiredActiveOrders(LocalDateTime.now());

        for (Order order : expiredOrders) {
            order.setStatus(OrderStatus.FAILED);
            order.setFailureReason("Order expired - payment not completed within time limit");
            orderRepository.save(order);

            // Also mark pending transactions as FAILED
            transactionRepository.findPendingByOrderId(order.getId())
                .ifPresent(tx -> {
                    tx.setStatus(TransactionStatus.FAILED);
                    tx.setFailureCode("ORDER_EXPIRED");
                    transactionRepository.save(tx);
                });
        }
    }
}
```

#### Part 3: Improved error response
Even if `DataIntegrityViolationException` is still thrown (race condition), the error response now includes order info:

```java
} catch (DataIntegrityViolationException ex) {
    Order existingOrder = orderRepository.findActiveOrderByUserId(userId).orElse(null);

    return CheckoutResultResponse.builder()
            .success(false)
            .orderId(existingOrder.getId())           // ✓ User can now cancel this order
            .orderNumber(existingOrder.getOrderNumber())
            .redirectUrl(transaction.getRedirectUrl()) // ✓ User can resume PayPal payment
            .message("You have an active checkout in progress.")
            .errorCode("CHECKOUT_IN_PROGRESS")
            .build();
}
```

### Files Modified
- `OrderRepository.java`:
  - Added `findActiveOrderByUserId(Long userId)` - finds PENDING/PROCESSING order
  - Added `findExpiredActiveOrders(LocalDateTime now)` - for scheduled cleanup
- `CheckoutServiceImpl.java`:
  - Added `handleExistingActiveOrder()` method
  - Updated `checkout()` to call `handleExistingActiveOrder()` first
  - Updated `directCheckout()` to call `handleExistingActiveOrder()` first
  - Improved `DataIntegrityViolationException` catch block to include order info
- `LmsCoreServiceApplication.java`:
  - Added `@EnableScheduling` annotation
- **NEW:** `OrderExpirationScheduler.java`:
  - Scheduled job runs every 5 minutes
  - Expires stuck PENDING/PROCESSING orders past their `expires_at` time

### How to Fix Existing Stuck Orders

```sql
-- Option 1: Mark all expired PROCESSING orders as FAILED
UPDATE payment.orders
SET status = 'FAILED',
    failure_reason = 'Order expired - payment not completed within time limit',
    updated_at = NOW()
WHERE status IN ('PENDING', 'PROCESSING')
  AND expires_at < NOW();

-- Also mark their pending transactions as FAILED
UPDATE payment.transactions t
SET status = 'FAILED',
    failure_code = 'ORDER_EXPIRED',
    failure_reason = 'Order expired before payment completion'
FROM payment.orders o
WHERE t.order_id = o.id
  AND t.status = 'PENDING'
  AND o.status = 'FAILED'
  AND o.failure_reason LIKE '%expired%';
```

```sql
-- Option 2: Find and review stuck orders first
SELECT o.id, o.order_number, o.user_id, o.status, o.total_amount,
       o.created_at, o.expires_at,
       NOW() - o.expires_at AS time_since_expiry
FROM payment.orders o
WHERE o.status IN ('PENDING', 'PROCESSING')
  AND o.expires_at < NOW()
ORDER BY o.created_at DESC;
```

### Behavior Changes

| Scenario | Before | After |
|----------|--------|-------|
| User has expired PROCESSING order | ❌ Blocked forever | ✅ Auto-expires, can checkout |
| User has valid PROCESSING order | ❌ Generic error, no order ID | ✅ Returns order info + PayPal URL |
| User wants to cancel stuck order | ❌ Doesn't know order ID | ✅ Can use returned orderId |
| Abandoned orders accumulate | ❌ Stay PROCESSING forever | ✅ Cleaned up every 5 minutes |

### Testing Checklist

- [ ] User with expired PROCESSING order can create new checkout
- [ ] User with valid PROCESSING order gets existing order info in response
- [ ] Response includes `orderId` and `redirectUrl` for active orders
- [ ] Scheduled job runs every 5 minutes and expires old orders
- [ ] Scheduled job marks pending transactions as FAILED
- [ ] `directCheckout()` also checks for existing active orders

---

## Potential Issues to Monitor

### Issue A: Partial Enrollment Failure
**Risk:** Medium
**Scenario:** Multi-course order where first course enrolls successfully but second fails.

**Current Behavior:** Entire order rolled back, but first enrollment might persist depending on transaction boundaries.

**Recommendation:** Consider implementing saga pattern or compensation logic for multi-item orders.

### Issue B: Gateway Timeout During Capture
**Risk:** Medium
**Scenario:** Network timeout during `gateway.capturePayment()` - payment may have succeeded at PayPal but we don't know.

**Current Behavior:** Marked as failed, user might retry and get double-charged.

**Recommendation:**
- Implement idempotent capture using PayPal's request ID
- Add scheduled job to reconcile pending transactions with PayPal

### Issue C: Refund Failure Alerting
**Risk:** Low
**Scenario:** Auto-refund fails, order marked with `MANUAL_REFUND_REQUIRED`, but no alert sent.

**Current Behavior:** Only logged and event published.

**Recommendation:**
- Add Slack/email notification for `MANUAL_REFUND_REQUIRED` orders
- Create admin dashboard widget for these orders

---

## Testing Checklist

### For Bug #1 Fix
- [ ] Simulate enrollment failure after successful PayPal capture
- [ ] Verify auto-refund is attempted
- [ ] Verify order status is `REFUNDED` when refund succeeds
- [ ] Verify order has `MANUAL_REFUND_REQUIRED:` prefix when refund fails
- [ ] Verify user receives appropriate error message
- [ ] Verify transaction status is updated correctly

### Integration Test Scenarios
```java
@Test
void whenPaymentCapturedButEnrollmentFails_shouldAutoRefund() {
    // Given: Valid order with PayPal payment
    // When: Capture succeeds but enrollmentService.enrollStudent() throws
    // Then: Order status = REFUNDED, Transaction status = REFUNDED
}

@Test
void whenPaymentCapturedAndRefundFails_shouldMarkForManualIntervention() {
    // Given: Valid order, enrollment fails, refund also fails
    // Then: Order status = FAILED, failure_reason contains "MANUAL_REFUND_REQUIRED"
}
```

---

## Recovery Procedures

### Manual Refund Process
1. Query orders needing manual refund (see SQL above)
2. Log into PayPal merchant dashboard
3. Find transaction by `gateway_transaction_id` (Capture ID)
4. Issue full refund
5. Update database:
   ```sql
   UPDATE payment.orders SET status = 'REFUNDED' WHERE id = ?;
   UPDATE payment.transactions SET status = 'REFUNDED' WHERE order_id = ?;
   ```

### Manual Enrollment Process (if refund not desired)
1. Query affected orders
2. For each order item, create enrollment:
   ```sql
   INSERT INTO course.enrollments (course_id, student_id, status, enrolled_at, ...)
   SELECT oi.course_id, o.user_id, 'ACTIVE', NOW(), ...
   FROM payment.orders o
   JOIN payment.order_items oi ON oi.order_id = o.id
   WHERE o.id = ?;
   ```
3. Update order status:
   ```sql
   UPDATE payment.orders SET status = 'COMPLETED' WHERE id = ?;
   ```

---

## Version History

| Date | Version | Changes |
|------|---------|---------|
| 2026-01-28 | 1.0 | Initial documentation, Bug #1 fix applied |
| 2026-01-28 | 1.1 | Bug #6 fix: Stuck PROCESSING orders blocking new checkouts, added scheduled cleanup job |
| 2026-01-28 | 1.2 | Senior review: 16 new bugs identified (Bug #7-#22), excluding WebhookServiceImpl (not implemented) |

---

# NEW BUGS DISCOVERED (Senior Review - 2026-01-28)

> **Note:** WebhookServiceImpl bugs excluded from this review as it is not yet implemented.

## Bug #7: Transaction Creation Busy Loop Without Delay (MEDIUM)

**Status:** UNFIXED
**Severity:** Medium
**Date Found:** 2026-01-28
**File:** `CheckoutServiceImpl.java`, lines 1251-1281

### Symptom
CPU spike during high-load periods when transaction number collisions occur.

### Root Cause
When transaction number collision happens, the retry loop has no delay:

```java
final int maxAttempts = 3;
int attempt = 0;
while (true) {
    attempt++;
    try {
        Transaction tx = new Transaction();
        tx.setTransactionNumber(numberGeneratorService.generateTransactionNumber());
        return transactionRepository.save(tx);
    } catch (DataIntegrityViolationException ex) {
        if (attempt >= maxAttempts) {
            throw ex;
        }
        // NO DELAY - busy loop!
    }
}
```

### Fix Required
Add exponential backoff:
```java
} catch (DataIntegrityViolationException ex) {
    if (attempt >= maxAttempts) {
        throw ex;
    }
    try {
        Thread.sleep(50 * attempt); // 50ms, 100ms, 150ms
    } catch (InterruptedException ie) {
        Thread.currentThread().interrupt();
        throw ex;
    }
}
```

---

## Bug #8: PayPal Amount Extraction - Scientific Notation Edge Case (MEDIUM)

**Status:** UNFIXED
**Severity:** Medium
**Date Found:** 2026-01-28
**File:** `PayPalGateway.java`, lines 196-236

### Symptom
Large payment amounts may fail to parse correctly.

### Root Cause
PayPal returns amount as string which could be in scientific notation for large values:

```java
value = capture.amount().value();  // Could be "1.00E+2" for 100.00
// ...
return GatewayPaymentResult.success(
    captureId,
    GATEWAY_NAME,
    new BigDecimal(value),  // May not parse scientific notation correctly
    currency
);
```

### Fix Required
Use explicit BigDecimal parsing:
```java
BigDecimal amount = new BigDecimal(value).setScale(2, RoundingMode.HALF_UP);
```

---

## Bug #9: Order Status Change Outside Transaction Context (MEDIUM)

**Status:** UNFIXED
**Severity:** Medium
**Date Found:** 2026-01-28
**File:** `CheckoutServiceImpl.java`, lines 509-515

### Symptom
Failed order recovery can leave order in inconsistent PROCESSING state.

### Root Cause
In `capturePayment()`, when recovering a FAILED order, status is changed outside the main transactional block:

```java
if (wasFailedOrder) {
    log.info("Attempting capture for failed order {} ...", order.getOrderNumber());
    order.setStatus(OrderStatus.PROCESSING);  // Outside @Transactional
    orderRepository.save(order);  // Separate transaction
}
// If exception occurs later, order stays PROCESSING but capture failed
```

### Fix Required
Wrap the status change in the same transaction as the capture logic, or use compensating transaction on failure.

---

## Bug #10: Missing Null Check in PayPal Capture Response (MEDIUM)

**Status:** UNFIXED
**Severity:** Medium
**Date Found:** 2026-01-28
**File:** `PayPalGateway.java`, lines 147-157

### Symptom
NPE when PayPal returns unexpected response.

### Root Cause
```java
if ("COMPLETED".equals(currentStatus)) {
    log.info("[PAYPAL] Order {} already COMPLETED", gatewayTransactionId);
    return extractCaptureResult(orderStatus);  // orderStatus could be null
}
```

### Fix Required
Add null checks before accessing response fields.

---

## Bug #11: LazyInitializationException Risk in Transaction Entity (MEDIUM)

**Status:** UNFIXED
**Severity:** Medium
**Date Found:** 2026-01-28
**File:** `Transaction.java`, line 20-22

### Symptom
`LazyInitializationException` when accessing `transaction.getOrder()` outside transaction context.

### Root Cause
```java
@ManyToOne(fetch = FetchType.LAZY)
@JoinColumn(name = "order_id", nullable = false)
private Order order;
```

Code in several places accesses `transaction.getOrder()` after the transaction has closed.

### Fix Required
Either:
1. Use `FetchType.EAGER` (impacts performance)
2. Always load order within transaction
3. Use entity graphs/join fetch

---

## Bug #12: Customer PII Not Encrypted at Rest (SECURITY)

**Status:** UNFIXED
**Severity:** Medium (Security/Compliance)
**Date Found:** 2026-01-28
**File:** `Order.java`, lines 91-105

### Symptom
Customer personal information stored in plaintext in database.

### Root Cause
```java
@Column(name = "customer_email", length = 255)
private String customerEmail;  // Plaintext!

@Column(name = "customer_name", length = 255)
private String customerName;  // Plaintext!

@Column(name = "billing_address", columnDefinition = "TEXT")
private String billingAddress;  // Plaintext!
```

### Fix Required
Use `EncryptionService` (already exists in auth-service) to encrypt PII:
```java
@Convert(converter = EncryptedStringConverter.class)
private String customerEmail;
```

---

## Bug #13: Inefficient Active Order Query - Missing LIMIT (LOW)

**Status:** UNFIXED
**Severity:** Low
**Date Found:** 2026-01-28
**File:** `OrderRepository.java`, lines 73-74

### Symptom
Slower performance when user has many abandoned orders.

### Root Cause
```java
@Query("SELECT o FROM Order o WHERE o.userId = :userId AND o.status IN ('PENDING', 'PROCESSING') ORDER BY o.createdAt DESC")
Optional<Order> findActiveOrderByUserId(@Param("userId") Long userId);
```

Query fetches ALL matching orders even though `Optional` implies single result. Missing `LIMIT 1`.

### Fix Required
Add native query with LIMIT or use `@Query` with `FETCH FIRST 1 ROW ONLY`.

---

# Frontend Bugs Discovered

## Bug #14: Double Submit Race Condition on Slow Networks (HIGH)

**Status:** UNFIXED
**Severity:** High
**Date Found:** 2026-01-28
**File:** `CheckoutPage.tsx`, lines 97-182

### Symptom
User can trigger multiple checkout requests on slow networks.

### Root Cause
The checkout button uses `disabled={!selectedPaymentMethod || isPending}` but `isPending` state update is async:

```typescript
const handleCheckout = async () => {
  setStep("processing");  // Async state update
  let result;
  if (isDirectCheckout && directCourseId) {
    result = await directCheckoutMutation.mutateAsync(directRequest);  // Could be called twice
  }
}
```

Between button click and state update, user can click again.

### Fix Required
Add ref-based mutex:
```typescript
const isSubmittingRef = useRef(false);

const handleCheckout = async () => {
  if (isSubmittingRef.current) return;
  isSubmittingRef.current = true;
  try {
    // ... checkout logic
  } finally {
    isSubmittingRef.current = false;
  }
}
```

---

## Bug #15: No Timeout Handling After PayPal Redirect (HIGH)

**Status:** UNFIXED
**Severity:** High
**Date Found:** 2026-01-28
**File:** `CheckoutSuccessPage.tsx`, lines 26-45

### Symptom
User stuck on "Completing Your Payment" indefinitely if backend is slow/unresponsive.

### Root Cause
```typescript
useEffect(() => {
  if (token && pageState === "loading") {
    capturePaymentMutation.mutate(token, {
      onSuccess: (result) => { ... },
      onError: (error) => { ... }
    });
  }
}, [token, pageState]);
// No timeout handling!
```

### Fix Required
Add timeout with retry option:
```typescript
const CAPTURE_TIMEOUT = 30000; // 30 seconds

useEffect(() => {
  const timeoutId = setTimeout(() => {
    if (pageState === "loading") {
      setPageState("timeout");
      // Show retry button or support contact
    }
  }, CAPTURE_TIMEOUT);

  return () => clearTimeout(timeoutId);
}, [pageState]);
```

---

## Bug #16: Missing Token Validation in CheckoutSuccessPage (MEDIUM)

**Status:** UNFIXED
**Severity:** Medium
**Date Found:** 2026-01-28
**File:** `CheckoutSuccessPage.tsx`, lines 15-20

### Symptom
Frontend blindly trusts URL parameters, could be manipulated.

### Root Cause
```typescript
const token = searchParams.get("token");  // No validation
capturePaymentMutation.mutate(token, { ... });  // Sends untrusted token
```

### Fix Required
Validate token format before using:
```typescript
const isValidToken = (token: string | null): boolean => {
  return token !== null && token.length > 0 && token.length < 100 && /^[A-Za-z0-9_-]+$/.test(token);
};
```

---

## Bug #17: Cart Cleared Before Payment Confirmation (MEDIUM)

**Status:** UNFIXED
**Severity:** Medium
**Date Found:** 2026-01-28
**File:** `CheckoutPage.tsx`, lines 159-164

### Symptom
Cart cleared even when payment is still pending redirect to PayPal.

### Root Cause
```typescript
if (result.success) {
  if (!isDirectCheckout) {
    clearCart();  // Cleared immediately!
  }
  navigate(`${USER_ROUTES.CHECKOUT_SUCCESS}?order=${result.orderNumber}`);
}
```

`result.success=true` might mean order created but payment not yet captured (pending PayPal redirect).

### Fix Required
Only clear cart after payment is fully captured, not on redirect:
```typescript
if (result.success && !result.requiresRedirect) {
  clearCart();
}
// Or clear cart in CheckoutSuccessPage after capture succeeds
```

---

## Bug #18: Preview Not Invalidated on Checkout Failure (MEDIUM)

**Status:** UNFIXED
**Severity:** Medium
**Date Found:** 2026-01-28
**File:** `useCheckout.ts`, lines 38-55

### Symptom
After checkout failure, user retries with stale pricing data.

### Root Cause
```typescript
export const useCheckout = () => {
  return useMutation<CheckoutResultResponse, Error, CheckoutRequest>({
    mutationFn: (request) => checkoutService.checkout(request),
    onSuccess: (result) => {  // Only on SUCCESS
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: queryKeys.cart.all });
      }
    },
    // Missing onError handler!
  });
};
```

### Fix Required
```typescript
onError: () => {
  queryClient.invalidateQueries({ queryKey: queryKeys.cart.all });
  queryClient.invalidateQueries({ queryKey: queryKeys.checkout.preview });
},
```

---

## Bug #19: Order Cancel Failure Silently Ignored (MEDIUM)

**Status:** UNFIXED
**Severity:** Medium
**Date Found:** 2026-01-28
**File:** `CheckoutFailedPage.tsx`, lines 19-32

### Symptom
Failed order cancellation logged but user not informed.

### Root Cause
```typescript
cancelPaymentMutation.mutate(Number(orderId), {
  onSuccess: () => {
    console.log("Payment cancellation recorded");  // Just a log
  },
  onError: (error) => {
    console.error("Failed to record cancellation:", error);  // Just a log
  },
});
```

### Fix Required
Show user-facing error with support contact info when cancellation fails.

---

## Bug #20: Optimistic Update Not Reversed on AddToCart Failure (MEDIUM)

**Status:** UNFIXED
**Severity:** Medium
**Date Found:** 2026-01-28
**File:** `AddToCartButton.tsx`, lines 62-72

### Symptom
Button shows inconsistent state when add-to-cart fails.

### Root Cause
```typescript
try {
  startAddingItem(courseId);  // Optimistic update
  await addToCart.mutateAsync(courseId);
  showSuccess("Course added to cart!");
} catch (error: any) {
  showError(error?.message || "Failed to add to cart");
  // Missing: rollback optimistic update completely
} finally {
  finishAddingItem(courseId);  // Only removes from pending
}
```

### Fix Required
Properly rollback both `pendingAdditions` and `items` on failure.

---

## Bug #21: Missing beforeunload Handler During Checkout (LOW)

**Status:** UNFIXED
**Severity:** Low
**Date Found:** 2026-01-28
**File:** `CheckoutPage.tsx`

### Symptom
User can navigate away during payment processing, leaving order in limbo.

### Fix Required
```typescript
useEffect(() => {
  const handleBeforeUnload = (e: BeforeUnloadEvent) => {
    if (isPending || step === "processing") {
      e.preventDefault();
      e.returnValue = "";
    }
  };

  window.addEventListener("beforeunload", handleBeforeUnload);
  return () => window.removeEventListener("beforeunload", handleBeforeUnload);
}, [isPending, step]);
```

---

## Bug #22: Direct Checkout courseId Not Validated (LOW)

**Status:** UNFIXED
**Severity:** Low
**Date Found:** 2026-01-28
**File:** `CheckoutPage.tsx`, lines 42-44

### Symptom
Invalid courseId parameter not caught.

### Root Cause
```typescript
const courseIdParam = searchParams.get("courseId");
const directCourseId = courseIdParam ? Number(courseIdParam) : null;
// Number("abc") = NaN, Number("0") = 0
```

### Fix Required
```typescript
const directCourseId = useMemo(() => {
  const param = searchParams.get("courseId");
  if (!param) return null;
  const id = parseInt(param, 10);
  return !isNaN(id) && id > 0 ? id : null;
}, [searchParams]);
```

---

# Summary of New Bugs

| Bug # | Title | Severity | Type | Status |
|-------|-------|----------|------|--------|
| 7 | Transaction creation busy loop | MEDIUM | Backend | UNFIXED |
| 8 | PayPal scientific notation parsing | MEDIUM | Backend | UNFIXED |
| 9 | Order status change outside transaction | MEDIUM | Backend | UNFIXED |
| 10 | Missing null check in PayPal capture | MEDIUM | Backend | UNFIXED |
| 11 | LazyInitializationException risk | MEDIUM | Backend | UNFIXED |
| 12 | Customer PII not encrypted | MEDIUM | Security | UNFIXED |
| 13 | Inefficient active order query | LOW | Backend | UNFIXED |
| 14 | Double submit race condition | HIGH | Frontend | UNFIXED |
| 15 | No timeout after PayPal redirect | HIGH | Frontend | UNFIXED |
| 16 | Missing token validation | MEDIUM | Frontend | UNFIXED |
| 17 | Cart cleared before confirmation | MEDIUM | Frontend | UNFIXED |
| 18 | Preview not invalidated on failure | MEDIUM | Frontend | UNFIXED |
| 19 | Order cancel failure silently ignored | MEDIUM | Frontend | UNFIXED |
| 20 | Optimistic update not reversed | MEDIUM | Frontend | UNFIXED |
| 21 | Missing beforeunload handler | LOW | Frontend | UNFIXED |
| 22 | Direct checkout courseId not validated | LOW | Frontend | UNFIXED |

---

# Priority Fix Order

## P1 - Fix Soon (Data Integrity / UX Critical)
1. **Bug #14** - Double submit race condition (duplicate orders possible)
2. **Bug #15** - PayPal redirect timeout (user stuck indefinitely)

## P2 - Fix in Next Sprint (Quality / Security)
3. **Bug #12** - PII encryption (compliance)
4. **Bug #17** - Cart cleared prematurely
5. **Bug #9** - Order status change outside transaction
6. **Bug #18** - Preview not invalidated on failure
7. **Bug #10** - Missing null check in PayPal capture

## P3 - Fix When Convenient (Minor)
8. All remaining MEDIUM and LOW severity bugs
