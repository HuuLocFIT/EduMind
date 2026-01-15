## Checkout Module Change Log

This document records **code changes** made to address issues from `CHECKOUT_VULNERABILITY_ANALYSIS.md`.

- **Scope**: `CheckoutServiceImpl`, `OrderServiceImpl`, payment entities/repositories, enrollment/cart/invoice logic.
- For each fix, capture:
  - **Issue** (link to analysis item)
  - **Files / methods changed**
  - **Before / After** code fragment
  - **Behavioral impact**

> Keep each snippet minimal – only the lines that actually changed.

---

### Template for Each Fix

#### Fix N – Short Title (e.g. “Concurrent Checkout Locking”)

- **Analysis reference**: `CHECKOUT_VULNERABILITY_ANALYSIS.md` → section `X. ...`
- **Date**: `YYYY-MM-DD`
- **Author**: `your-name`
- **Issue summary**:
  - One–two sentences describing the problem.
- **Files touched**:
  - `path/to/FileOne.java` – `methodName(...)`
  - `path/to/FileTwo.java` – `anotherMethod(...)`

**Before**

```java
// Old code fragment here
```

**After**

```java
// New code fragment here
```

**Behavior & Notes**

- What changed in behavior (API responses, side effects, error codes)?
- Any migration / data considerations?
- New tests added or updated (optional).

---

### Planned Fixes (Mapping to Analysis)

Use the template above for each of these items as you implement them:

1. **Concurrent checkout race condition** – user/cart level locking.
2. **Payment callback vs direct success race** – idempotent order completion.
3. **Order amount vs payment amount validation**.
4. **Cart state validation between preview and checkout**.
5. **Course availability validation during order creation**.
6. **Duplicate transaction prevention for the same order**.
7. **Enrollment re-validation between preview and checkout**.
8. **Transaction number/idempotency hardening**.
9. **Order status validation before (re)processing payment**.
10. **Atomic / resilient order completion (enrollments, earnings, invoices)**.
11. **Gateway transaction ID uniqueness & idempotency**.
12. **Callback ownership/authentication validation**.
13. **Free-order double-processing guard**.
14. **Safer cart clearing – only clear items included in the order**.
15. **Order expiration, retry limits, and related logic gaps**.

For each implemented fix, add a new **“Fix N – …”** section above using the template and mark the corresponding item here as **done** (e.g. `1. ✅ ...`).

---

#### Fix 1 – Order Status Guards, Idempotent Completion & Amount Validation

- **Analysis reference**:
  - `CHECKOUT_VULNERABILITY_ANALYSIS.md` → sections:
    - `2. Race Condition: Payment Callback vs Direct Payment Success`
    - `3. Missing Validation: Order Amount vs Payment Amount`
    - `9. Missing Validation: Order Status Before Payment Processing`
    - `10. Missing Atomicity: Order Completion`
- **Date**: 2026-01-15
- **Author**: checkout-hardening
- **Issue summary**:
  - Guard against re-processing payments for already completed or processing orders.
  - Make order completion idempotent when triggered multiple times (direct success + callback).
  - Validate that the processed amount from the gateway matches the order total and fail safely on mismatch.
- **Files touched**:
  - `src/main/java/com/edumind/lms/modules/payment/entity/Order.java`
  - `src/main/java/com/edumind/lms/modules/payment/service/CheckoutServiceImpl.java`

**Before**

```java
// Order.java (no optimistic locking)
@Builder
public class Order extends BaseEntity {
    @Column(name = "order_number", nullable = false, unique = true, length = 50)
    private String orderNumber;
    // ...
}

// CheckoutServiceImpl.processPayment(...) – no status guard, no amount validation
private CheckoutResultResponse processPayment(Order order, CheckoutRequest request, boolean isFromCart) {
    log.info("Processing payment for order: {}", order.getOrderNumber());

    PaymentGateway gateway = gatewayRegistry.getActiveGateway();

    // create PENDING transaction ...

    GatewayPaymentResult result = gateway.processPayment(gatewayRequest);

    transaction.setGatewayTransactionId(result.getGatewayTransactionId());
    transaction.setGatewayResponse(result.getRawResponse());

    if (result.getLocalAmount() != null) {
        transaction.setLocalAmount(result.getLocalAmount());
        transaction.setLocalCurrency(result.getLocalCurrency());
        transaction.setExchangeRate(result.getExchangeRate());
    }

    if (result.isSuccess()) {
        transaction.setStatus(TransactionStatus.SUCCESS);
        transaction.setProcessedAt(LocalDateTime.now());
        transactionRepository.save(transaction);

        return handleSuccessfulPayment(order, transaction, isFromCart);
    }
    // ...
}

// CheckoutServiceImpl.handleSuccessfulPayment(...) – always completes order again
@Transactional
private CheckoutResultResponse handleSuccessfulPayment(Order order, Transaction transaction,
                                                       boolean isFromCart) {
    log.info("Payment successful for order: {}", order.getOrderNumber());

    order.setStatus(OrderStatus.COMPLETED);
    order.setCompletedAt(LocalDateTime.now());
    orderRepository.save(order);
    // ...
}
```

**After**

```java
// Order.java – add optimistic locking
@Builder
public class Order extends BaseEntity {

    @Version
    @Column(name = "version")
    private Long version;

    @Column(name = "order_number", nullable = false, unique = true, length = 50)
    private String orderNumber;
    // ...
}

// CheckoutServiceImpl.processPayment(...) – status guard + amount validation
private CheckoutResultResponse processPayment(Order order, CheckoutRequest request, boolean isFromCart) {
    log.info("Processing payment for order: {}", order.getOrderNumber());

    // Guard: already completed
    if (order.getStatus() == OrderStatus.COMPLETED) {
        Transaction latestTx = transactionRepository.findFirstByOrderIdOrderByCreatedAtDesc(order.getId())
                .orElse(null);
        List<OrderItem> orderItems = orderItemRepository.findByOrderId(order.getId());

        CheckoutResultResponse.CheckoutResultResponseBuilder builder = CheckoutResultResponse.builder()
                .success(true)
                .orderId(order.getId())
                .orderNumber(order.getOrderNumber())
                .orderStatus(order.getStatus())
                .totalAmount(order.getTotalAmount())
                .currency(order.getCurrency())
                .paymentMethod(order.getPaymentMethod())
                .enrolledCourseIds(orderItems.stream()
                        .map(OrderItem::getCourseId)
                        .collect(Collectors.toList()))
                .createdAt(order.getCreatedAt())
                .completedAt(order.getCompletedAt())
                .message("Order already completed. No additional payment was processed.");

        if (latestTx != null) {
            builder
                    .transactionNumber(latestTx.getTransactionNumber())
                    .gatewayTransactionId(latestTx.getGatewayTransactionId());
        }

        return builder.build();
    }

    // Guard: processing
    if (order.getStatus() == OrderStatus.PROCESSING) {
        Transaction latestTx = transactionRepository.findFirstByOrderIdOrderByCreatedAtDesc(order.getId())
                .orElse(null);

        CheckoutResultResponse.CheckoutResultResponseBuilder builder = CheckoutResultResponse.builder()
                .success(false)
                .pending(true)
                .orderId(order.getId())
                .orderNumber(order.getOrderNumber())
                .orderStatus(order.getStatus())
                .totalAmount(order.getTotalAmount())
                .currency(order.getCurrency())
                .paymentMethod(order.getPaymentMethod())
                .createdAt(order.getCreatedAt())
                .message("Payment is already being processed for this order.");

        if (latestTx != null) {
            builder
                    .transactionNumber(latestTx.getTransactionNumber())
                    .gatewayTransactionId(latestTx.getGatewayTransactionId())
                    .redirectUrl(latestTx.getRedirectUrl())
                    .requiresRedirect(latestTx.getRedirectUrl() != null);
        }

        return builder.build();
    }

    PaymentGateway gateway = gatewayRegistry.getActiveGateway();
    GatewayPaymentResult result = gateway.processPayment(gatewayRequest);

    transaction.setGatewayTransactionId(result.getGatewayTransactionId());
    transaction.setGatewayResponse(result.getRawResponse());

    if (result.getLocalAmount() != null) {
        transaction.setLocalAmount(result.getLocalAmount());
        transaction.setLocalCurrency(result.getLocalCurrency());
        transaction.setExchangeRate(result.getExchangeRate());
    }

    // Amount validation against order total
    if (result.getAmount() != null &&
            result.getAmount().compareTo(order.getTotalAmount()) != 0) {
        transaction.setStatus(TransactionStatus.FAILED);
        transaction.setFailureCode("AMOUNT_MISMATCH");
        transaction.setFailureReason("Gateway charged " + result.getAmount() + " " + result.getCurrency()
                + " but order total is " + order.getTotalAmount() + " " + order.getCurrency());
        transactionRepository.save(transaction);

        return handleFailedPayment(order, transaction, result);
    }

    if (result.isSuccess()) {
        transaction.setStatus(TransactionStatus.SUCCESS);
        transaction.setProcessedAt(LocalDateTime.now());
        transactionRepository.save(transaction);
        return handleSuccessfulPayment(order, transaction, isFromCart);
    }
    // ...
}

// CheckoutServiceImpl.handleSuccessfulPayment(...) – idempotent completion
@Transactional
private CheckoutResultResponse handleSuccessfulPayment(Order order, Transaction transaction,
                                                       boolean isFromCart) {
    log.info("Payment successful for order: {}", order.getOrderNumber());

    if (order.getStatus() == OrderStatus.COMPLETED) {
        List<OrderItem> orderItems = orderItemRepository.findByOrderId(order.getId());

        CheckoutResultResponse.CheckoutResultResponseBuilder responseBuilder = CheckoutResultResponse.builder()
                .success(true)
                .orderId(order.getId())
                .orderNumber(order.getOrderNumber())
                .transactionNumber(transaction.getTransactionNumber())
                .gatewayTransactionId(transaction.getGatewayTransactionId())
                .orderStatus(order.getStatus())
                .totalAmount(order.getTotalAmount())
                .currency(order.getCurrency())
                .paymentMethod(order.getPaymentMethod())
                .enrolledCourseIds(orderItems.stream()
                        .map(OrderItem::getCourseId)
                        .collect(Collectors.toList()))
                .createdAt(order.getCreatedAt())
                .completedAt(order.getCompletedAt())
                .message("Order was already completed. No additional changes were applied.");

        Invoice existingInvoice = order.getInvoice();
        if (existingInvoice != null) {
            responseBuilder
                    .invoiceNumber(existingInvoice.getInvoiceNumber())
                    .invoiceUrl(existingInvoice.getPdfUrl());
        }

        return responseBuilder.build();
    }

    order.setStatus(OrderStatus.COMPLETED);
    order.setCompletedAt(LocalDateTime.now());
    orderRepository.save(order);
    // ...
}
```

**Behavior & Notes**

- Additional payment attempts for an already **completed** order now return a success response without re-contacting the gateway or mutating state.
- For **processing** orders, subsequent calls surface the existing transaction/redirect information instead of creating new transactions.
- Gateway **amount mismatches** are now detected and turned into structured failures (`AMOUNT_MISMATCH`) without completing the order.
- `Order` is now **optimistically locked**, reducing silent races on status updates.


---

#### Fix 2 – Duplicate Transaction Prevention & Enrollment Re-Validation

- **Analysis reference**:
  - `CHECKOUT_VULNERABILITY_ANALYSIS.md` → sections:
    - `6. Missing Validation: Duplicate Transaction Creation`
    - `7. Missing Validation: Enrollment Status Change`
- **Date**: 2026-01-15
- **Author**: checkout-hardening
- **Issue summary**:
  - Prevent multiple PENDING transactions from being created for the same order.
  - Re-validate enrollment at fulfillment time to avoid duplicate enrollments in race conditions.
- **Files touched**:
  - `src/main/java/com/edumind/lms/modules/payment/repository/TransactionRepository.java`
  - `src/main/java/com/edumind/lms/modules/payment/service/CheckoutServiceImpl.java`

**Before**

```java
// TransactionRepository.java – no status-filtered lookup
List<Transaction> findByOrderIdOrderByCreatedAtDesc(Long orderId);

Optional<Transaction> findFirstByOrderIdOrderByCreatedAtDesc(Long orderId);

// CheckoutServiceImpl.processPayment(...) – always creates a new PENDING transaction
Transaction transaction = new Transaction();
transaction.setTransactionNumber(numberGeneratorService.generateTransactionNumber());
transaction.setOrder(order);
transaction.setGateway(order.getPaymentMethod());
transaction.setAmount(order.getTotalAmount());
transaction.setCurrency(order.getCurrency());
transaction.setStatus(TransactionStatus.PENDING);
transaction.setCreatedAt(LocalDateTime.now());

transaction = transactionRepository.save(transaction);
log.info("Created PENDING transaction: {}", transaction.getTransactionNumber());

// createEnrollmentsForOrder(...) – no extra enrollment re-validation
for (OrderItem item : items) {
    try {
        enrollmentService.enrollStudent(item.getCourseId(), order.getUserId());
        log.debug("Created enrollment for user {} in course {}",
                order.getUserId(), item.getCourseId());
    } catch (Exception e) {
        log.error("Failed to create enrollment for course {}: {}",
                item.getCourseId(), e.getMessage());
        throw new PaymentFailedException("Failed to activate enrollment: " + e.getMessage());
    }
}
```

**After**

```java
// TransactionRepository.java – status-aware lookup
List<Transaction> findByOrderIdOrderByCreatedAtDesc(Long orderId);

Optional<Transaction> findFirstByOrderIdOrderByCreatedAtDesc(Long orderId);

Optional<Transaction> findFirstByOrderIdAndStatusOrderByCreatedAtDesc(Long orderId, TransactionStatus status);

// CheckoutServiceImpl.processPayment(...) – reuse existing PENDING when present
Transaction transaction = transactionRepository
        .findFirstByOrderIdAndStatusOrderByCreatedAtDesc(order.getId(), TransactionStatus.PENDING)
        .orElseGet(() -> {
            Transaction tx = new Transaction();
            tx.setTransactionNumber(numberGeneratorService.generateTransactionNumber());
            tx.setOrder(order);
            tx.setGateway(order.getPaymentMethod());
            tx.setAmount(order.getTotalAmount());
            tx.setCurrency(order.getCurrency());
            tx.setStatus(TransactionStatus.PENDING);
            tx.setCreatedAt(LocalDateTime.now());
            return transactionRepository.save(tx);
        });

log.info("Using PENDING transaction: {}", transaction.getTransactionNumber());

// createEnrollmentsForOrder(...) – skip if already enrolled
for (OrderItem item : items) {
    try {
        boolean alreadyEnrolled = enrollmentRepository.existsByCourseIdAndStudentIdAndStatusNot(
                item.getCourseId(), order.getUserId(), EnrollmentStatus.DROPPED);

        if (alreadyEnrolled) {
            log.debug("Skipping enrollment for user {} in course {} - already enrolled",
                    order.getUserId(), item.getCourseId());
            continue;
        }

        enrollmentService.enrollStudent(item.getCourseId(), order.getUserId());
        log.debug("Created enrollment for user {} in course {}", order.getUserId(), item.getCourseId());
    } catch (Exception e) {
        log.error("Failed to create enrollment for course {}: {}",
                item.getCourseId(), e.getMessage());
        throw new PaymentFailedException("Failed to activate enrollment: " + e.getMessage());
    }
}
```

**Behavior & Notes**

- Only **one active PENDING transaction** is maintained per order; repeated calls reuse this transaction instead of creating new records.
- Enrollment creation now **re-checks** current enrollment state right before calling `enrollStudent`, avoiding duplicate enrollments when multiple completion paths race.


---

#### Fix 3 – Order Expiration Window for Payments

- **Analysis reference**:
  - `CHECKOUT_VULNERABILITY_ANALYSIS.md` → section:
    - `1. No Order Expiration`
- **Date**: 2026-01-15
- **Author**: checkout-hardening
- **Issue summary**:
  - Introduce an expiration window for orders and block payments for expired orders.
- **Files touched**:
  - `src/main/java/com/edumind/lms/modules/payment/entity/Order.java`
  - `src/main/java/com/edumind/lms/modules/payment/service/OrderServiceImpl.java`
  - `src/main/java/com/edumind/lms/modules/payment/service/CheckoutServiceImpl.java`

**Before**

```java
// Order.java – no expiration field
@Column(name = "completed_at")
private LocalDateTime completedAt;

// OrderServiceImpl – order creation without expiry
order.setCreatedAt(LocalDateTime.now());
order.setUpdatedAt(LocalDateTime.now());

// CheckoutServiceImpl.processPayment(...) – no expiry check
log.info("Processing payment for order: {}", order.getOrderNumber());
```

**After**

```java
// Order.java – add expiresAt
@Column(name = "completed_at")
private LocalDateTime completedAt;

@Column(name = "expires_at")
private LocalDateTime expiresAt;

// OrderServiceImpl – set 30-minute expiration at creation
order.setCreatedAt(LocalDateTime.now());
order.setUpdatedAt(LocalDateTime.now());
order.setExpiresAt(LocalDateTime.now().plusMinutes(30));

// CheckoutServiceImpl.processPayment(...) – enforce expiration
log.info("Processing payment for order: {}", order.getOrderNumber());

if (order.getExpiresAt() != null && LocalDateTime.now().isAfter(order.getExpiresAt())
        && order.getStatus() != OrderStatus.COMPLETED) {
    log.warn("Order {} has expired. Current status: {}", order.getOrderNumber(), order.getStatus());
    order.setStatus(OrderStatus.FAILED);
    order.setFailureReason("Order expired before payment was completed.");
    orderRepository.save(order);

    return CheckoutResultResponse.builder()
            .success(false)
            .orderId(order.getId())
            .orderNumber(order.getOrderNumber())
            .orderStatus(order.getStatus())
            .totalAmount(order.getTotalAmount())
            .currency(order.getCurrency())
            .paymentMethod(order.getPaymentMethod())
            .createdAt(order.getCreatedAt())
            .message("This order has expired. Please create a new checkout.")
            .errorCode("ORDER_EXPIRED")
            .errorMessage("Order expired before payment was completed.")
            .build();
}
```

**Behavior & Notes**

- Orders now have a **30-minute payment window** by default; after that, any payment attempt is rejected with `ORDER_EXPIRED`.
- Expired orders are marked `FAILED` with a clear `failureReason`, simplifying admin and user support flows.


---

#### Fix 4 – Gateway Response & FX Validation

- **Analysis reference**:
  - `CHECKOUT_VULNERABILITY_ANALYSIS.md` → sections:
    - `11. Add gateway response validation`
    - `14. Add currency conversion validation`
- **Date**: 2026-01-15
- **Author**: checkout-hardening
- **Issue summary**:
  - Add defensive validation around gateway responses to avoid processing obviously invalid results.
  - Log suspicious FX conversions (amount * rate vs. localAmount) without breaking normal flows.
- **Files touched**:
  - `src/main/java/com/edumind/lms/modules/payment/service/CheckoutServiceImpl.java`

**Before**

```java
// CheckoutServiceImpl.processPayment(...) – no gateway null check, no FX sanity
GatewayPaymentResult result = gateway.processPayment(gatewayRequest);

transaction.setGatewayTransactionId(result.getGatewayTransactionId());
transaction.setGatewayResponse(result.getRawResponse());

if (result.getLocalAmount() != null) {
    transaction.setLocalAmount(result.getLocalAmount());
    transaction.setLocalCurrency(result.getLocalCurrency());
    transaction.setExchangeRate(result.getExchangeRate());
}
```

**After**

```java
// CheckoutServiceImpl.processPayment(...) – gateway null check + FX logging
GatewayPaymentResult result = gateway.processPayment(gatewayRequest);

// Basic gateway response validation
if (result == null) {
    log.error("Payment gateway returned null result for order {}", order.getOrderNumber());
    transaction.setStatus(TransactionStatus.FAILED);
    transaction.setFailureCode("GATEWAY_NULL_RESPONSE");
    transaction.setFailureReason("Payment gateway returned an invalid response.");
    transactionRepository.save(transaction);

    GatewayPaymentResult safeResult = GatewayPaymentResult.builder()
            .success(false)
            .status(null)
            .errorCode("GATEWAY_NULL_RESPONSE")
            .errorMessage("Payment gateway returned an invalid response.")
            .build();
    return handleFailedPayment(order, transaction, safeResult);
}

transaction.setGatewayTransactionId(result.getGatewayTransactionId());
transaction.setGatewayResponse(result.getRawResponse());

if (result.getLocalAmount() != null) {
    transaction.setLocalAmount(result.getLocalAmount());
    transaction.setLocalCurrency(result.getLocalCurrency());
    transaction.setExchangeRate(result.getExchangeRate());
}

// FX / currency sanity checks (non-fatal, logging only)
try {
    if (result.getExchangeRate() != null && result.getExchangeRate().compareTo(BigDecimal.ZERO) <= 0) {
        log.warn("Order {} received non-positive exchange rate from gateway: {}",
                order.getOrderNumber(), result.getExchangeRate());
    }
    if (result.getAmount() != null
            && result.getLocalAmount() != null
            && result.getExchangeRate() != null) {
        BigDecimal expectedLocal = result.getAmount().multiply(result.getExchangeRate());
        BigDecimal diff = expectedLocal.subtract(result.getLocalAmount()).abs();
        if (diff.compareTo(BigDecimal.ONE) > 0) {
            log.warn("Order {} FX mismatch: expected local {} but got {} (rate {}, base {})",
                    order.getOrderNumber(), expectedLocal, result.getLocalAmount(),
                    result.getExchangeRate(), result.getAmount());
        }
    }
} catch (Exception fxEx) {
    log.warn("Order {} FX validation error: {}", order.getOrderNumber(), fxEx.getMessage());
}
```

**Behavior & Notes**

- A `null` gateway result now becomes a structured failure with `GATEWAY_NULL_RESPONSE` instead of causing NPEs.
- FX anomalies (bad exchange rate or inconsistent local amount) are **logged** for investigation but do not block the user’s payment.


---

#### Fix 5 – Retry Limits, Audit Logging & Invoice Retry

- **Analysis reference**:
  - `CHECKOUT_VULNERABILITY_ANALYSIS.md` → sections:
    - `12. Add retry limits`
    - `13. Add audit logging`
    - `15. Add invoice generation retry mechanism`
- **Date**: 2026-01-15
- **Author**: checkout-hardening
- **Issue summary**:
  - Limit the number of payment attempts per order and record when they occur.
  - Capture client IP/user-agent on the order for audit.
  - Add a small retry loop around invoice generation/PDF creation.
- **Files touched**:
  - `src/main/java/com/edumind/lms/modules/payment/entity/Order.java`
  - `src/main/java/com/edumind/lms/modules/payment/service/OrderServiceImpl.java`
  - `src/main/java/com/edumind/lms/modules/payment/service/CheckoutServiceImpl.java`
  - `src/main/resources/db/migration/V12__Add_order_retry_and_last_attempt.sql`

**Before**

```java
// Order.java – no retry metadata
@Column(name = "expires_at")
private LocalDateTime expiresAt;

// OrderServiceImpl – no IP / userAgent set
order.setCreatedAt(LocalDateTime.now());
order.setUpdatedAt(LocalDateTime.now());
order.setExpiresAt(LocalDateTime.now().plusMinutes(30));

// CheckoutServiceImpl.processPayment(...) – no retry limit, no audit of attempts
log.info("Processing payment for order: {}", order.getOrderNumber());

// Invoice generation – single try/catch
InvoiceResponse invoice = null;
try {
    invoice = invoiceService.generateInvoice(order);
    invoiceService.generateInvoicePdf(invoice.getId());
    invoice = invoiceService.getInvoiceById(invoice.getId());
} catch (Exception e) {
    log.error("Failed to generate invoice for order: {}", order.getOrderNumber(), e);
}
```

**After**

```java
// Order.java – add retry metadata
@Column(name = "expires_at")
private LocalDateTime expiresAt;

@Column(name = "retry_count")
@Builder.Default
private Integer retryCount = 0;

@Column(name = "last_payment_attempt_at")
private LocalDateTime lastPaymentAttemptAt;

// V12 migration – keep DB schema in sync
ALTER TABLE payment.orders
ADD COLUMN IF NOT EXISTS retry_count INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_payment_attempt_at TIMESTAMP;

// OrderServiceImpl – store client audit info
order.setCreatedAt(LocalDateTime.now());
order.setUpdatedAt(LocalDateTime.now());
order.setExpiresAt(LocalDateTime.now().plusMinutes(30));

order.setIpAddress(request.getIpAddress());
order.setUserAgent(request.getUserAgent());

// CheckoutServiceImpl.processPayment(...) – enforce retry limit and track attempts
private static final int MAX_PAYMENT_ATTEMPTS = 3;

Integer currentRetryCount = order.getRetryCount() != null ? order.getRetryCount() : 0;
if (currentRetryCount >= MAX_PAYMENT_ATTEMPTS) {
    log.warn("Order {} has reached max payment attempts ({})", order.getOrderNumber(), MAX_PAYMENT_ATTEMPTS);
    order.setStatus(OrderStatus.FAILED);
    order.setFailureReason("Maximum payment retry attempts exceeded.");
    orderRepository.save(order);

    return CheckoutResultResponse.builder()
            .success(false)
            .orderId(order.getId())
            .orderNumber(order.getOrderNumber())
            .orderStatus(order.getStatus())
            .totalAmount(order.getTotalAmount())
            .currency(order.getCurrency())
            .paymentMethod(order.getPaymentMethod())
            .createdAt(order.getCreatedAt())
            .message("Maximum payment retry attempts exceeded. Please create a new checkout.")
            .errorCode("RETRY_LIMIT_EXCEEDED")
            .errorMessage("Maximum payment retry attempts exceeded.")
            .build();
}

order.setRetryCount(currentRetryCount + 1);
order.setLastPaymentAttemptAt(LocalDateTime.now());
orderRepository.save(order);

// Invoice generation – with retry helper
private InvoiceResponse generateInvoiceWithRetry(Order order, int maxAttempts) {
    InvoiceResponse invoice = null;
    int attempt = 0;
    while (attempt < maxAttempts) {
        attempt++;
        try {
            log.debug("Generating invoice for order {} (attempt {}/{})",
                    order.getOrderNumber(), attempt, maxAttempts);

            invoice = invoiceService.generateInvoice(order);
            invoiceService.generateInvoicePdf(invoice.getId());
            invoice = invoiceService.getInvoiceById(invoice.getId());

            return invoice;
        } catch (Exception e) {
            log.error("Failed to generate invoice for order {} on attempt {}/{}: {}",
                    order.getOrderNumber(), attempt, maxAttempts, e.getMessage(), e);
        }
    }

    log.error("Giving up invoice generation for order {} after {} attempts",
            order.getOrderNumber(), maxAttempts);
    return null;
}
```

**Behavior & Notes**

- Each order now allows **up to 3 payment attempts**; further attempts are rejected with `RETRY_LIMIT_EXCEEDED`.
- Every payment attempt updates `retryCount` and `last_payment_attempt_at`, giving you an audit trail of how many times a user tried to pay.
- Orders now store `ipAddress` and `userAgent` from checkout requests, improving auditability and fraud analysis.
- Invoice generation is retried up to 3 times before giving up, reducing user-facing issues from transient failures.

