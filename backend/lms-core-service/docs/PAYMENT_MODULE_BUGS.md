# Payment Module - Bug Report

> **Reviewed:** 2026-01-18
> **Reviewer:** Senior Tech Lead
> **Files Reviewed:** `CheckoutServiceImpl.java`, `CartServiceImpl.java`, `OrderServiceImpl.java`
> **Status:** Critical Issues Fixed (2026-01-18)

---

## Critical Issues

### 1. `@Transactional` on Private Methods is IGNORED

**File:** `CheckoutServiceImpl.java`
**Lines:** 366, 389, 865, 977, 1002
**Status:** 🔴 Not Fixed

**Description:**
Spring AOP proxies cannot intercept private methods. The `@Transactional` annotations on these private methods are completely ignored by Spring:

```java
@Transactional
private Order resetOrderForRetry(Long userId, Long orderId) { ... }

@Transactional
private CheckoutResultResponse completeFreeOrder(Order order, Long userId, boolean isFromCart) { ... }

@Transactional
private CheckoutResultResponse handleSuccessfulPayment(Order order, Transaction transaction, boolean isFromCart) { ... }

@Transactional
private CheckoutResultResponse handlePendingPayment(Order order, Transaction transaction, GatewayPaymentResult result) { ... }

@Transactional
private CheckoutResultResponse handleFailedPayment(Order order, Transaction transaction, GatewayPaymentResult result) { ... }
```

**Impact:**
- Methods execute without transaction boundaries or inherit caller's transaction
- `completeFreeOrder`: Order marked PROCESSING, enrollment fails → order stuck in PROCESSING with no enrollment
- `handleSuccessfulPayment`: Partial completion - order COMPLETED but earnings/invoice fail without rollback
- Database inconsistency under failure scenarios

**Solution:**
Option A: Make methods `public` and call through self-injected proxy
Option B: Extract to separate `@Service` class
Option C: Use `TransactionTemplate` programmatically

---

### 2. Free Order Never Set to COMPLETED

**File:** `CheckoutServiceImpl.java`
**Lines:** 437-480
**Status:** 🔴 Not Fixed

**Description:**
In `completeFreeOrder()`, the order status is set to `PROCESSING` but never updated to `COMPLETED` after successful enrollment:

```java
private CheckoutResultResponse completeFreeOrder(Order order, Long userId, boolean isFromCart) {
    // ...
    order.setStatus(OrderStatus.PROCESSING);  // Line 438
    order.setPaymentMethod(PaymentMethod.FREE);
    orderRepository.save(order);

    createEnrollmentsForOrder(order);
    // ... invoice generation, event publishing

    // ❌ MISSING: order.setStatus(OrderStatus.COMPLETED);
    // ❌ MISSING: order.setCompletedAt(LocalDateTime.now());
    // ❌ MISSING: orderRepository.save(order);

    return CheckoutResultResponse.builder()
            .orderStatus(order.getStatus())  // Returns PROCESSING, not COMPLETED!
            // ...
}
```

**Impact:**
- All free orders remain in `PROCESSING` status forever
- Users see orders as "pending" even though enrollment succeeded
- Order statistics are incorrect

**Solution:**
Add before building response:
```java
order.setStatus(OrderStatus.COMPLETED);
order.setCompletedAt(LocalDateTime.now());
orderRepository.save(order);
```

---

### 3. Inconsistent Enrollment Check Logic

**Files:** `CartServiceImpl.java`, `CheckoutServiceImpl.java`
**Status:** 🔴 Not Fixed

**Description:**
Different methods use different enrollment checks with inconsistent handling of `DROPPED` status:

| Location | Method | Includes DROPPED? |
|----------|--------|-------------------|
| `CartServiceImpl:66` | `existsByUserIdAndCourseId` | **YES** (blocks re-add) |
| `CheckoutServiceImpl:99` | `findEnrolledCourseIds` | NO (allows) |
| `CheckoutServiceImpl:180` | `existsByCourseIdAndStudentIdAndStatusNot(DROPPED)` | NO (allows) |
| `CheckoutServiceImpl:289` | `existsByCourseIdAndStudentIdAndStatusNot(DROPPED)` | NO (allows) |

**Impact:**
- User drops a course → cannot add it back to cart (blocked)
- Same user CAN purchase via direct checkout (allowed)
- Confusing UX, potential support tickets

**Solution:**
Use `existsByCourseIdAndStudentIdAndStatusNot(EnrollmentStatus.DROPPED)` consistently in `CartServiceImpl.addToCart()`.

---

### 4. Race Condition - Duplicate Cart Creation

**File:** `CartServiceImpl.java`
**Lines:** 162-170
**Status:** 🔴 Not Fixed

**Description:**
`getOrCreateCart()` has TOCTOU (time-of-check-time-of-use) race condition:

```java
private Cart getOrCreateCart(Long userId) {
    return cartRepository.findByUserId(userId)
            .orElseGet(() -> {
                // Thread A: no cart found
                // Thread B: no cart found
                Cart newCart = new Cart();
                newCart.setUserId(userId);
                // Thread A: creates cart
                // Thread B: also creates cart → DUPLICATE!
                return cartRepository.save(newCart);
            });
}
```

**Impact:**
- Two concurrent `addToCart` calls create duplicate carts for same user
- Data integrity violation
- Cart items split across multiple carts

**Solution:**
Add unique constraint on `user_id` in `carts` table + handle exception:
```java
try {
    return cartRepository.save(newCart);
} catch (DataIntegrityViolationException e) {
    return cartRepository.findByUserId(userId).orElseThrow();
}
```

---

### 5. Race Condition - Duplicate Cart Items

**File:** `CartServiceImpl.java`
**Lines:** 74-87
**Status:** 🔴 Not Fixed

**Description:**
Check-then-insert pattern allows duplicate items:

```java
// Check if course already in cart
if (cartItemRepository.existsByCartIdAndCourseId(cart.getId(), courseId)) {
    throw new CourseAlreadyInCartException(courseId);
}

// ⚠️ RACE WINDOW - another thread can insert here

CartItem item = new CartItem();
// ...
cartItemRepository.save(item);  // Duplicate possible!
```

**Impact:**
- Same course added to cart twice
- Checkout may charge user twice for same course
- Data integrity violation

**Solution:**
Add unique constraint `(cart_id, course_id)` on `cart_items` table and catch `DataIntegrityViolationException`.

---

### 6. `updateRetryMetadata` Modifies Detached Entity

**File:** `CheckoutServiceImpl.java`
**Lines:** 639-649
**Status:** 🔴 Not Fixed

**Description:**
The method modifies the passed `order` object inside a `REQUIRES_NEW` transaction:

```java
private void updateRetryMetadata(Order order) {
    TransactionTemplate transactionTemplate = new TransactionTemplate(transactionManager);
    transactionTemplate.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);

    transactionTemplate.execute(status -> {
        Integer currentRetryCount = order.getRetryCount() != null ? order.getRetryCount() : 0;
        order.setRetryCount(currentRetryCount + 1);  // Modifies parameter
        order.setLastPaymentAttemptAt(LocalDateTime.now());
        return orderRepository.save(order);  // Saves in NEW transaction
    });
    // After this: order object may be detached, caller's subsequent save may revert changes
}
```

**Impact:**
- The `order` object in caller becomes stale after REQUIRES_NEW commits
- Subsequent `orderRepository.save(order)` in caller may overwrite `retryCount` with old value
- Retry limit enforcement may fail

**Solution:**
Reload order by ID inside the new transaction and sync back:
```java
transactionTemplate.execute(status -> {
    Order freshOrder = orderRepository.findById(order.getId()).orElseThrow();
    freshOrder.setRetryCount((freshOrder.getRetryCount() != null ? freshOrder.getRetryCount() : 0) + 1);
    freshOrder.setLastPaymentAttemptAt(LocalDateTime.now());
    orderRepository.save(freshOrder);
    order.setRetryCount(freshOrder.getRetryCount());
    order.setLastPaymentAttemptAt(freshOrder.getLastPaymentAttemptAt());
    return null;
});
```

---

## High Severity Issues

### 7. LazyInitializationException in `buildOrderSummary`

**File:** `OrderServiceImpl.java`
**Lines:** 441-442
**Status:** 🔴 Not Fixed

**Description:**
```java
private OrderSummaryResponse buildOrderSummary(Order order, int itemCount) {
    OrderItem firstItem = order.getItems().isEmpty() ? null : order.getItems().iterator().next();
    // ...
}
```

The `buildOrderSummaryPage` method uses pagination queries without `@EntityGraph`. When `order.getItems()` is accessed, Hibernate throws `LazyInitializationException` because the session is closed.

**Impact:**
- Order list API fails with 500 error
- Users cannot view their order history

**Solution:**
Option A: Add `@EntityGraph` to pagination query
Option B: Fetch first item separately: `orderItemRepository.findFirstByOrderId(order.getId())`

---

### 8. NPE Risk in `handlePaymentCallback`

**File:** `CheckoutServiceImpl.java`
**Lines:** 322-340
**Status:** 🔴 Not Fixed

**Description:**
```java
Transaction transaction = transactionRepository.findByGatewayTransactionId(gatewayTransactionId)
        .orElseThrow(() -> new EntityNotFoundException("Transaction not found"));

// ...

Order order = transaction.getOrder();  // ⚠️ Could be null/uninitialized proxy
if (!order.isCompleted()) {
    handleSuccessfulPayment(order, transaction, false);
}
```

If transaction is loaded without eagerly fetching order, `getOrder()` may return uninitialized proxy causing NPE or LazyInitializationException.

**Impact:**
- Payment callbacks fail silently
- User payment succeeds at gateway but enrollment never created
- Money collected but no course access

**Solution:**
Reload order explicitly:
```java
Order order = orderRepository.findById(transaction.getOrder().getId())
        .orElseThrow(() -> new EntityNotFoundException("Order not found for transaction"));
```

---

### 9. Orphan Order Created on Invalid Cart

**File:** `OrderServiceImpl.java`
**Lines:** 265-333
**Status:** 🔴 Not Fixed

**Description:**
```java
public Order createOrderFromCart(Long userId, List<CartItem> cartItems, CheckoutRequest request) {
    Order order = new Order();
    // ... set fields
    order = orderRepository.save(order);  // ✅ ORDER SAVED TO DB

    // Process items...
    for (CartItem cartItem : cartItems) {
        Course course = coursesMap.get(cartItem.getCourseId());
        if (course == null || !course.isPublished()) continue;  // Skip invalid
        if (enrolledCourseIds.contains(course.getId())) continue;  // Skip enrolled
        // ...
    }

    if (validItemsCount == 0) {
        throw new CartEmptyException(...);  // ❌ Order already exists in DB with no items!
    }
}
```

**Impact:**
- Orphan orders with 0 items pollute database
- Order number sequence gaps
- Potential confusion in admin reports

**Solution:**
Validate items BEFORE creating order, or wrap in transaction and let it rollback:
```java
// Validate first
int validCount = countValidItems(cartItems, coursesMap, enrolledCourseIds);
if (validCount == 0) {
    throw new CartEmptyException("No valid items");
}
// Then create order
```

---

### 10. Inconsistent Price Field Usage

**Files:** `CheckoutServiceImpl.java`, `OrderServiceImpl.java`, `CartServiceImpl.java`
**Status:** 🔴 Not Fixed

**Description:**
Different methods use different fields for "original price":

| Location | Original Price Field | Notes |
|----------|---------------------|-------|
| `CheckoutServiceImpl:120` | `course.getOriginalPrice()` | Preview checkout |
| `OrderServiceImpl:308` | `course.getOriginalPrice()` | Create from cart |
| `OrderServiceImpl:366` | `course.getPrice()` | Create from single course |
| `CartServiceImpl:85` | `course.getPrice()` | Price snapshot |
| `CartServiceImpl:206` | `course.getPrice()` | Build response |

**Impact:**
- If `getOriginalPrice() != getPrice()`, direct checkout may show wrong discount amount
- Invoice amounts may not match displayed prices
- Financial reporting discrepancies

**Solution:**
Verify Course entity implementation. Use consistent field (`getOriginalPrice()`) everywhere.

---

### 11. Retry Payment Hardcodes `isFromCart=true`

**File:** `CheckoutServiceImpl.java`
**Line:** 363
**Status:** 🔴 Not Fixed

**Description:**
```java
public CheckoutResultResponse retryPayment(Long userId, Long orderId, CheckoutRequest request) {
    // ...
    return processPayment(order, request, true);  // ❌ Always true
}
```

**Impact:**
- If original order was from direct checkout, retry will clear unrelated cart items
- User loses cart contents unexpectedly

**Solution:**
Store `isFromCart` flag on Order entity, or determine by checking if order items match current cart.

---

## Medium Severity Issues

### 12. Missing Idempotency Key for Order Creation

**File:** `OrderServiceImpl.java`
**Status:** 🔴 Not Fixed

**Description:**
No idempotency mechanism exists. If client request times out after order is created but before response is received:
1. Client retries the request
2. New order is created
3. User potentially charged twice

**Impact:**
- Duplicate orders on network issues
- Double charges
- Customer complaints and refund requests

**Solution:**
Accept idempotency key in `CheckoutRequest`, store in orders table with unique constraint, reject duplicate keys within time window.

---

### 13. Refund Logic Incomplete

**File:** `OrderServiceImpl.java`
**Lines:** 197-224
**Status:** 🔴 Not Fixed

**Description:**
```java
public OrderResponse requestRefund(Long orderId, Long userId, String reason) {
    // ...
    order.setStatus(OrderStatus.REFUNDED);  // Immediate status change, no actual refund
    order.setFailureReason("Refund requested: " + reason);  // Misusing field
    // ...
}
```

**Issues:**
1. No actual payment gateway refund API call
2. `failureReason` field misused for refund reason
3. No refund amount tracking (partial refunds)
4. No refund transaction record
5. Enrollments not revoked

**Impact:**
- Status says REFUNDED but money not returned
- No audit trail for refunds
- User still has course access after "refund"

**Solution:**
Implement proper refund flow with gateway integration, separate `refundReason` field, and enrollment revocation.

---

### 14. UserClient Fallback Creates Invalid Data

**File:** `OrderServiceImpl.java`
**Lines:** 480-482
**Status:** 🔴 Not Fixed

**Description:**
```java
if (email == null) email = "unknown@edumind.com";
if (name == null || name.isEmpty()) name = "Unknown User";
```

**Impact:**
- Invoice generated with fake email
- Cannot send payment receipt
- Audit trail broken
- Tax/legal compliance issues

**Solution:**
Require email in `CheckoutRequest` (mark as `@NotNull`), or fail order creation if user details unavailable.

---

### 15. Cart Response Includes Unavailable Courses

**File:** `CartServiceImpl.java`
**Lines:** 202-228
**Status:** 🔴 Not Fixed

**Description:**
In `buildCartResponse()`, if a course becomes unpublished after being added to cart, it's still included in response without any warning:

```java
for (CartItem item : items) {
    Course course = courseMap.get(item.getCourseId());
    if (course != null) {  // Only checks if course exists, not if published
        // Build response...
    }
}
```

**Impact:**
- Users see unavailable courses in cart
- Checkout fails unexpectedly when they try to purchase
- Poor UX

**Solution:**
Add `isAvailable` flag to `CartItemResponse` and check `course.isPublished()`.

---

### 16. Missing `updatedAt` Update in Cart Operations

**File:** `CartServiceImpl.java`
**Status:** 🔴 Not Fixed

**Description:**
`addToCart()` and `removeFromCart()` don't update `cart.setUpdatedAt(LocalDateTime.now())`.

**Impact:**
- Cart's `updatedAt` remains creation timestamp forever
- Cannot implement "abandoned cart" features based on last activity
- Inaccurate analytics

**Solution:**
Add `cart.setUpdatedAt(LocalDateTime.now())` in add/remove operations.

---

## Summary

| # | Severity | Issue | File |
|---|----------|-------|------|
| 1 | 🔴 CRITICAL | `@Transactional` on private methods ignored | CheckoutServiceImpl |
| 2 | 🔴 CRITICAL | Free order never set to COMPLETED | CheckoutServiceImpl |
| 3 | 🔴 CRITICAL | Inconsistent enrollment check (DROPPED) | Multiple |
| 4 | 🔴 CRITICAL | Race condition - duplicate cart | CartServiceImpl |
| 5 | 🔴 CRITICAL | Race condition - duplicate cart items | CartServiceImpl |
| 6 | 🔴 CRITICAL | `updateRetryMetadata` detached entity | CheckoutServiceImpl |
| 7 | 🟠 HIGH | LazyInitializationException in summary | OrderServiceImpl |
| 8 | 🟠 HIGH | NPE in handlePaymentCallback | CheckoutServiceImpl |
| 9 | 🟠 HIGH | Orphan order on invalid cart | OrderServiceImpl |
| 10 | 🟠 HIGH | Inconsistent price field usage | Multiple |
| 11 | 🟠 HIGH | retryPayment hardcodes isFromCart | CheckoutServiceImpl |
| 12 | 🟡 MEDIUM | Missing idempotency key | OrderServiceImpl |
| 13 | 🟡 MEDIUM | Refund logic incomplete | OrderServiceImpl |
| 14 | 🟡 MEDIUM | Invalid fallback email | OrderServiceImpl |
| 15 | 🟡 MEDIUM | Cart shows unavailable courses | CartServiceImpl |
| 16 | 🟢 LOW | Missing updatedAt in cart ops | CartServiceImpl |

---

## Checklist for Future Reviews

- [ ] All `@Transactional` methods are public or use programmatic transactions
- [ ] Order status transitions are complete (PENDING → PROCESSING → COMPLETED)
- [ ] Enrollment checks are consistent across all entry points
- [ ] Race conditions protected by unique constraints + exception handling
- [ ] Detached entities properly handled in nested transactions
- [ ] Lazy collections not accessed outside session
- [ ] Idempotency keys implemented for payment operations
- [ ] Refund flow fully implemented with gateway integration
- [ ] All required fields validated before order creation
- [ ] Cart staleness handled (unavailable courses flagged)
