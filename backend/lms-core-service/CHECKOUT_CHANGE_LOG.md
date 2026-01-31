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

1. ✅ **Concurrent checkout race condition** – user/cart level locking (DB unique index + application guard).
2. **Payment callback vs direct success race** – idempotent order completion.
3. **Order amount vs payment amount validation**.
4. **Cart state validation between preview and checkout**.
5. **Course availability validation during order creation**.
6. **Duplicate transaction prevention for the same order**.
7. **Enrollment re-validation between preview and checkout**.
8. **Transaction number/idempotency hardening**.
9. **Order status validation before (re)processing payment**.
10. **Atomic / resilient order completion (enrollments, earnings, invoices)**.
11. ✅ **Gateway transaction ID uniqueness & idempotency**.
12. **Callback ownership/authentication validation**.
13. ✅ **Free-order double-processing guard**.
14. ✅ **Safer cart clearing – only clear items included in the order**.
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

#### Fix 3 – Transaction Number Collision Handling & Gateway Tx ID Uniqueness

- **Analysis reference**:
  - `CHECKOUT_VULNERABILITY_ANALYSIS.md` → section `8. Missing Idempotency: Transaction Number Generation`
  - `CHECKOUT_VULNERABILITY_ANALYSIS.md` → section `11. Missing Validation: Gateway Transaction ID Uniqueness`
- **Date**: 2026-01-15
- **Author**: checkout-hardening-2
- **Issue summary**:
  - Protect against rare collisions on `transactions.transaction_number` when generating new PENDING transactions.
  - Enforce uniqueness of `gateway_transaction_id` at the database level to make duplicate callbacks/transactions safe and detectable.
- **Files touched**:
  - `src/main/java/com/edumind/lms/modules/payment/service/CheckoutServiceImpl.java`
  - `src/main/resources/db/migration/V14__Add_unique_gateway_transaction_id.sql`

**Before**

```java
// CheckoutServiceImpl.processPayment(...) – create PENDING transaction without retry
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

// DB – no uniqueness constraint for gateway_transaction_id
-- transactions table had a unique constraint only on transaction_number
-- gateway_transaction_id was nullable and not constrained
```

**After**

```java
// CheckoutServiceImpl – factor creation into helper with retry on constraint violation
private Transaction createOrReusePendingTransaction(Order order) {
    return transactionRepository
            .findFirstByOrderIdAndStatusOrderByCreatedAtDesc(order.getId(), TransactionStatus.PENDING)
            .orElseGet(() -> {
                final int maxAttempts = 3;
                int attempt = 0;
                while (true) {
                    attempt++;
                    try {
                        Transaction tx = new Transaction();
                        tx.setTransactionNumber(numberGeneratorService.generateTransactionNumber());
                        tx.setOrder(order);
                        tx.setGateway(order.getPaymentMethod());
                        tx.setAmount(order.getTotalAmount());
                        tx.setCurrency(order.getCurrency());
                        tx.setStatus(TransactionStatus.PENDING);
                        tx.setCreatedAt(LocalDateTime.now());
                        return transactionRepository.save(tx);
                    } catch (DataIntegrityViolationException ex) {
                        if (attempt >= maxAttempts) {
                            log.error("Failed to create transaction for order {} after {} attempts due to " +
                                            "transaction number collision or constraint violation",
                                    order.getOrderNumber(), maxAttempts, ex);
                            throw ex;
                        }
                        log.warn("Retrying transaction creation for order {} due to constraint violation (attempt {}/{})",
                                order.getOrderNumber(), attempt, maxAttempts);
                    }
                }
            });
}

// DB migration – add unique index for gateway_transaction_id
CREATE UNIQUE INDEX IF NOT EXISTS ux_transactions_gateway_tx_id
ON payment.transactions (gateway_transaction_id)
WHERE gateway_transaction_id IS NOT NULL;
```

**Behavior & Notes**

- Creating a new PENDING transaction for an order now **retries up to 3 times** if a unique constraint violation occurs, making transaction number collisions highly unlikely to surface to callers.
- `gateway_transaction_id` is now **unique (when not null)**, so duplicate callbacks or attempts to persist the same gateway transaction twice will hit a well-defined constraint instead of creating inconsistent data.
- Existing callback logic (`handlePaymentCallback`) already treats a successful transaction as idempotent; with the new index, the system is better protected against accidental duplicate transaction rows for the same gateway ID.

---

#### Fix 4 – Free Order Idempotency & Safer Cart Clearing

- **Analysis reference**:
  - `CHECKOUT_VULNERABILITY_ANALYSIS.md` → section `14. Missing Validation: Free Order Double Processing`
  - `CHECKOUT_VULNERABILITY_ANALYSIS.md` → section `15. Missing Validation: Cart Clearing Race Condition`
- **Date**: 2026-01-15
- **Author**: checkout-hardening-2
- **Issue summary**:
  - Make `completeFreeOrder` idempotent and safe when invoked multiple times or under races.
  - Replace full-cart clearing with targeted removal of only the items that were part of the completed order.
- **Files touched**:
  - `src/main/java/com/edumind/lms/modules/payment/service/CheckoutServiceImpl.java`
  - `src/main/java/com/edumind/lms/modules/payment/service/CartService.java`
  - `src/main/java/com/edumind/lms/modules/payment/service/CartServiceImpl.java`
  - `src/main/java/com/edumind/lms/modules/payment/repository/CartItemRepository.java`

**Before**

```java
// CheckoutServiceImpl.completeFreeOrder(...) – not idempotent, clears whole cart
@Transactional
private CheckoutResultResponse completeFreeOrder(Order order, Long userId, boolean isFromCart) {
    log.info("Completing free order: {}", order.getOrderNumber());

    // Complete order
    order.setStatus(OrderStatus.COMPLETED);
    order.setPaymentMethod(PaymentMethod.FREE);
    order.setCompletedAt(LocalDateTime.now());
    orderRepository.save(order);

    // Create enrollments
    createEnrollmentsForOrder(order);

    // Clear cart only if checkout was from cart
    if (isFromCart) {
        cartService.clearCart(userId);
    }
    // ...
}

// CheckoutServiceImpl.handleSuccessfulPayment(...) – clear whole cart
if (isFromCart) {
    try {
        cartService.clearCart(order.getUserId());
    } catch (Exception e) {
        log.error("Failed to clear cart for user: {}", order.getUserId(), e);
    }
}

// CartService – no item-level removal API
void clearCart(Long userId);
```

**After**

```java
// CartService – new API for item-level removal
public interface CartService {
    // ...
    /**
     * Remove specific courses from cart (used after successful checkout)
     */
    void removeItems(Long userId, List<Long> courseIds);
}

// CartItemRepository – bulk delete by cart and course IDs
@Modifying
@Query("DELETE FROM CartItem ci WHERE ci.cart.id = :cartId AND ci.courseId IN :courseIds")
void deleteByCartIdAndCourseIds(@Param("cartId") Long cartId, @Param("courseIds") List<Long> courseIds);

// CartServiceImpl – implementation of item removal
@Override
@Transactional
public void removeItems(Long userId, List<Long> courseIds) {
    if (courseIds == null || courseIds.isEmpty()) {
        return;
    }

    log.info("Removing {} course(s) from cart for user {}", courseIds.size(), userId);

    cartRepository.findByUserId(userId).ifPresent(cart -> {
        cartItemRepository.deleteByCartIdAndCourseIds(cart.getId(), courseIds);
        log.info("Removed {} course(s) from cart for user {}", courseIds.size(), userId);
    });
}

// CheckoutServiceImpl.completeFreeOrder(...) – idempotent + item-level cart clearing
@Transactional
private CheckoutResultResponse completeFreeOrder(Order order, Long userId, boolean isFromCart) {
    log.info("Completing free order: {}", order.getOrderNumber());

    // Idempotency and status guards
    if (order.getStatus() == OrderStatus.COMPLETED) {
        log.info("Free order {} is already COMPLETED. Skipping duplicate completion.", order.getOrderNumber());
        List<OrderItem> existingItems = orderItemRepository.findByOrderId(order.getId());
        // ... build success response from existing state ...
    }

    if (order.getStatus() == OrderStatus.PROCESSING) {
        log.info("Free order {} is in PROCESSING state. Treating as pending and not re-triggering side effects.",
                order.getOrderNumber());
        List<OrderItem> existingItems = orderItemRepository.findByOrderId(order.getId());
        // ... build pending response ...
    }

    // Mark as processing during completion to reduce race risk
    order.setStatus(OrderStatus.PROCESSING);
    order.setPaymentMethod(PaymentMethod.FREE);
    orderRepository.save(order);

    // Create enrollments
    createEnrollmentsForOrder(order);

    // Load order items explicitly
    List<OrderItem> orderItems = orderItemRepository.findByOrderId(order.getId());

    // Clear only items that were actually ordered
    if (isFromCart) {
        List<Long> courseIds = orderItems.stream()
                .map(OrderItem::getCourseId)
                .collect(Collectors.toList());
        cartService.removeItems(userId, courseIds);
    }

    // Generate invoice, publish event, build response...
}

// CheckoutServiceImpl.handleSuccessfulPayment(...) – also uses item-level clearing
// (similar pattern: compute courseIds from orderItems and call cartService.removeItems)
```

**Behavior & Notes**

- Calling `completeFreeOrder` multiple times is now **idempotent**: completed orders return the existing completion result, and processing orders surface a pending state instead of re-running side effects.
- Both free and paid checkout flows now **only remove items from the cart that correspond to the completed order**, avoiding the previous race where unrelated items added during checkout could be lost.
- The new `CartService.removeItems` API centralizes item-level cart cleanup and can be reused by future partial-order or multi-order flows.

---

#### Fix 5 – Cart Signature Validation Between Preview and Checkout

- **Analysis reference**:
  - `CHECKOUT_VULNERABILITY_ANALYSIS.md` → section `4. Missing Validation: Cart State Between Preview and Checkout`
  - `CHECKOUT_VULNERABILITY_ANALYSIS_2.md` → section `2. Cart Signature / Versioning for Preview–Checkout Consistency`
- **Date**: 2026-01-15
- **Author**: checkout-hardening-3
- **Issue summary**:
  - Detect when the cart contents/pricing change between `previewCheckout` and `checkout` to prevent TOCTOU issues.
  - Provide an opaque `cartSignature` to the frontend so it can be echoed back on checkout.
- **Files touched**:
  - `src/main/java/com/edumind/lms/modules/payment/dto/response/CheckoutPreviewResponse.java`
  - `src/main/java/com/edumind/lms/modules/payment/dto/request/CheckoutRequest.java`
  - `src/main/java/com/edumind/lms/modules/payment/service/CheckoutServiceImpl.java`

**Before**

```java
// CheckoutPreviewResponse – no cart signature
@Builder
public class CheckoutPreviewResponse {
    private List<CheckoutItemPreview> items;
    private int itemCount;
    private BigDecimal subtotal;
    private BigDecimal discountTotal;
    private BigDecimal totalAmount;
    private String currency;
    // ...
}

// CheckoutRequest – no field to carry preview state
@Builder
public class CheckoutRequest {
    @NotNull
    private PaymentMethod paymentMethod;
    // ...
}

// CheckoutServiceImpl.checkout(...) – no validation of cart state between preview and checkout
public CheckoutResultResponse checkout(Long userId, CheckoutRequest request) {
    Cart cart = cartRepository.findByUserId(userId)
            .orElseThrow(() -> new CartEmptyException());
    List<CartItem> cartItems = cartItemRepository.findByCartId(cart.getId());
    if (cartItems.isEmpty()) {
        throw new CartEmptyException();
    }
    Order order = orderService.createOrderFromCart(userId, cartItems, request);
    // ...
}
```

**After**

```java
// CheckoutPreviewResponse – include cartSignature
@Builder
public class CheckoutPreviewResponse {
    // ...
    private BigDecimal totalAmount;
    private String currency;
    // Payment options
    @JsonProperty("isFreeCheckout")
    private boolean isFreeCheckout;
    private boolean requiresPayment;
    private List<String> availablePaymentMethods;

    /**
     * Opaque cart signature returned to the client during preview and
     * echoed back on checkout to detect cart changes between preview and checkout.
     */
    private String cartSignature;
}

// CheckoutRequest – client can echo back cartSignature
@Builder
public class CheckoutRequest {
    @NotNull(message = "Payment method is required")
    private PaymentMethod paymentMethod;
    // ...
    /**
     * Optional cart signature returned from preview.
     * When provided, checkout() will validate that the current cart state
     * matches the previewed state before creating an order.
     */
    private String cartSignature;
}

// CheckoutServiceImpl.previewCheckout(...) – compute cartSignature
BigDecimal totalAmount = subtotal.subtract(totalDiscount);
boolean allFree = totalAmount.compareTo(BigDecimal.ZERO) == 0;
String cartSignature = buildCartSignature(userId, itemPreviews, totalAmount);

return CheckoutPreviewResponse.builder()
        .items(itemPreviews)
        .itemCount(itemPreviews.size())
        .subtotal(subtotal)
        .discountTotal(totalDiscount)
        .totalAmount(totalAmount)
        .currency("USD")
        .isFreeCheckout(allFree)
        .requiresPayment(!allFree)
        .cartSignature(cartSignature)
        .warnings(warnings.isEmpty() ? null : warnings)
        .build();

// CheckoutServiceImpl.checkout(...) – optional signature validation
List<CartItem> cartItems = cartItemRepository.findByCartId(cart.getId());
if (cartItems.isEmpty()) {
    throw new CartEmptyException();
}

// Optional cart signature validation (only if client provided one)
if (request.getCartSignature() != null) {
    CheckoutPreviewResponse currentPreview = previewCheckout(userId);
    if (!request.getCartSignature().equals(currentPreview.getCartSignature())) {
        log.warn("Cart signature mismatch for user {}. Expected: {}, Actual: {}",
                userId, request.getCartSignature(), currentPreview.getCartSignature());
        return CheckoutResultResponse.builder()
                .success(false)
                .orderStatus(null)
                .message("Your cart has changed since the last preview. Please review your cart and try again.")
                .errorCode("CART_CHANGED")
                .errorMessage("Cart changed between preview and checkout")
                .build();
    }
}

// Helper to build deterministic signature
private String buildCartSignature(Long userId, List<CheckoutItemPreview> items, BigDecimal totalAmount) {
    MessageDigest digest = MessageDigest.getInstance("SHA-256");
    StringBuilder sb = new StringBuilder();
    sb.append("user:").append(userId).append("|");
    items.stream()
            .sorted((a, b) -> a.getCourseId().compareTo(b.getCourseId()))
            .forEach(item -> sb.append(item.getCourseId())
                    .append(":")
                    .append(item.getEffectivePrice())
                    .append(":")
                    .append(item.getCurrency())
                    .append("|"));
    sb.append("total:").append(totalAmount);
    // ... compute hex digest ...
}
```

**Behavior & Notes**

- Frontend now receives an opaque `cartSignature` from both cart and direct checkout previews and can include it on the subsequent `checkout` call.
- When `cartSignature` is present, `checkout(...)` re-computes the current cart signature and **fails fast** with `CART_CHANGED` if anything about the cart contents/pricing has changed.
- The validation is **opt-in** for backward compatibility: if `cartSignature` is omitted, behavior is unchanged from before.

---

#### Fix 6 – Payment Method Capability Validation & Gateway Currency Support

- **Analysis reference**:
  - `CHECKOUT_VULNERABILITY_ANALYSIS.md` → logic gap `2. No Payment Method Validation`
  - `CHECKOUT_VULNERABILITY_ANALYSIS_2.md` → section `3. Payment Method Capability Validation & Routing`
- **Date**: 2026-01-15
- **Author**: checkout-hardening-3
- **Issue summary**:
  - Centralize validation of whether a selected `PaymentMethod` is valid for the order currency and active gateway.
  - Populate available payment methods on preview based on gateway currency support.
- **Files touched**:
  - `src/main/java/com/edumind/lms/modules/payment/service/PaymentMethodPolicyService.java`
  - `src/main/java/com/edumind/lms/modules/payment/service/PaymentMethodPolicyServiceImpl.java`
  - `src/main/java/com/edumind/lms/modules/payment/service/CheckoutServiceImpl.java`

**Before**

```java
// No policy service; CheckoutServiceImpl does not validate payment method beyond enum presence.

// CheckoutServiceImpl.processPayment(...) – directly calls gateway
order.setRetryCount(currentRetryCount + 1);
order.setLastPaymentAttemptAt(LocalDateTime.now());
orderRepository.save(order);

PaymentGateway gateway = gatewayRegistry.getActiveGateway();
GatewayPaymentResult result = gateway.processPayment(gatewayRequest);
```

**After**

```java
// PaymentMethodPolicyService – interface
public interface PaymentMethodPolicyService {
    void validatePaymentMethod(PaymentMethod paymentMethod, String currency);
    List<PaymentMethod> getAvailableMethods(String currency);
}

// PaymentMethodPolicyServiceImpl – simple policy using active gateway's supportsCurrency
@Service
@RequiredArgsConstructor
@Slf4j
public class PaymentMethodPolicyServiceImpl implements PaymentMethodPolicyService {

    private final PaymentGatewayRegistry gatewayRegistry;

    @Override
    public void validatePaymentMethod(PaymentMethod paymentMethod, String currency) {
        if (paymentMethod == PaymentMethod.FREE) {
            return;
        }
        PaymentGateway gateway = gatewayRegistry.getActiveGateway();
        if (!gateway.supportsCurrency(currency)) {
            log.warn("Payment method {} via gateway {} does not support currency {}",
                    paymentMethod, gateway.getGatewayName(), currency);
            throw new PaymentFailedException(
                    "Selected payment method is not available for currency: " + currency);
        }
    }

    @Override
    public List<PaymentMethod> getAvailableMethods(String currency) {
        PaymentGateway gateway = gatewayRegistry.getActiveGateway();
        if (!gateway.supportsCurrency(currency)) {
            return List.of(PaymentMethod.FREE);
        }
        return Arrays.stream(PaymentMethod.values())
                .filter(method -> method != PaymentMethod.FREE)
                .collect(Collectors.toList());
    }
}

// CheckoutServiceImpl – inject policy and validate in processPayment
private final PaymentMethodPolicyService paymentMethodPolicyService;

private CheckoutResultResponse processPayment(Order order, CheckoutRequest request, boolean isFromCart) {
    // ... retry metadata ...
    order.setRetryCount(currentRetryCount + 1);
    order.setLastPaymentAttemptAt(LocalDateTime.now());
    orderRepository.save(order);

    // Validate payment method capabilities for this currency before contacting gateway
    if (order.getPaymentMethod() != null) {
        paymentMethodPolicyService.validatePaymentMethod(order.getPaymentMethod(), order.getCurrency());
    }

    PaymentGateway gateway = gatewayRegistry.getActiveGateway();
    GatewayPaymentResult result = gateway.processPayment(gatewayRequest);
    // ...
}
```

**Behavior & Notes**

- If the active gateway does not support the order currency, checkout now fails early with a `BadRequest` (`PaymentFailedException`), instead of reaching the gateway and failing in undefined ways.
- **Development/Testing**: `MockPaymentGateway.supportsCurrency()` returns `true` for all currencies, so this validation does not interfere with mock gateway testing or development workflows.
- The policy layer is intentionally simple but centralized, making it easy to refine later (per-gateway/per-method rules, regional restrictions, etc.).

---

#### Fix 7 – Webhook HMAC Verification for SePay

- **Analysis reference**:
  - `CHECKOUT_VULNERABILITY_ANALYSIS.md` → section `12. Missing Validation: Order Ownership in Callback`
  - `CHECKOUT_VULNERABILITY_ANALYSIS_2.md` → section `4. Callback Replay Protection & Multi-Tenant Ownership Checks` (partial)
- **Date**: 2026-01-15
- **Author**: checkout-hardening-3
- **Issue summary**:
  - Implement concrete HMAC-SHA256 verification for SePay webhooks using a shared secret.
  - Make invalid/missing signatures fail verification instead of being silently accepted.
- **Files touched**:
  - `src/main/java/com/edumind/lms/modules/payment/service/WebhookServiceImpl.java`
  - `src/test/java/com/edumind/lms/modules/payment/service/WebhookServiceTest.java`

**Before**

```java
// WebhookServiceImpl.verifySepaySignature(...) – effectively a stub
private boolean verifySepaySignature(WebhookPayloadRequest request, String signature) {
    // TODO: Implement SePay signature verification in production
    if (sepayWebhookSecret == null || sepayWebhookSecret.isEmpty()) {
        log.warn("SePay signature verification skipped - no secret configured");
        return true;
    }

    // Verify HMAC-SHA256 signature
    // String dataToSign = request.getOrderNumber() + request.getAmount() + request.getStatus();
    // String expectedSignature = HmacUtils.hmacSha256Hex(sepayWebhookSecret, dataToSign);
    // return expectedSignature.equals(signature);

    log.info("SePay signature verification for order: {}", request.getOrderNumber());
    return true;
}
```

**After**

```java
private boolean verifySepaySignature(WebhookPayloadRequest request, String signature) {
    if (sepayWebhookSecret == null || sepayWebhookSecret.isEmpty()) {
        log.warn("SePay signature verification skipped - no secret configured");
        return true;
    }

    if (signature == null || signature.isEmpty()) {
        log.warn("Missing SePay signature for order {}", request.getOrderNumber());
        return false;
    }

    try {
        String dataToSign = request.getOrderNumber()
                + "|" + request.getAmount()
                + "|" + request.getStatus();

        Mac mac = Mac.getInstance("HmacSHA256");
        SecretKeySpec keySpec = new SecretKeySpec(
                sepayWebhookSecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
        mac.init(keySpec);
        byte[] rawHmac = mac.doFinal(dataToSign.getBytes(StandardCharsets.UTF_8));

        StringBuilder hex = new StringBuilder(rawHmac.length * 2);
        for (byte b : rawHmac) {
            String h = Integer.toHexString(0xff & b);
            if (h.length() == 1) {
                hex.append('0');
            }
            hex.append(h);
        }
        String expectedSignature = hex.toString();

        boolean valid = expectedSignature.equalsIgnoreCase(signature);
        if (!valid) {
            log.warn("Invalid SePay signature for order {}. Expected {}, got {}",
                    request.getOrderNumber(), expectedSignature, signature);
        }
        return valid;
    } catch (Exception e) {
        log.error("Error verifying SePay signature for order {}: {}",
                request.getOrderNumber(), e.getMessage(), e);
        return false;
    }
}
```

**Behavior & Notes**

- With `payment.sepay.webhook-secret` configured, SePay webhooks now require a valid HMAC-SHA256 signature over `orderNumber|amount|status`; invalid or missing signatures cause verification to fail.
- **Development/Testing**: If `payment.sepay.webhook-secret` is **not configured** (empty/null), signature verification is **skipped** and returns `true`, so this feature does not interfere with mock gateway testing or development workflows.
- Mock and PayPal behavior are unchanged; PayPal still logs verification intent but expects a production SDK-backed implementation.
- A new unit test in `WebhookServiceTest` verifies that a correctly computed HMAC passes the `verifySignature` check for SePay.

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


---

#### Fix 8 – StaleObjectStateException Guard (Reload on Completion)

- **Analysis reference**: _None (Runtime Bug)_
- **Date**: 2026-01-15
- **Author**: checkout-hardening-fix
- **Issue summary**:
  - `StaleObjectStateException` occurred when `handleSuccessfulPayment` tried to update an `Order` that had been modified concurrently by a payment webhook.
- **Files touched**:
  - `src/main/java/com/edumind/lms/modules/payment/service/CheckoutServiceImpl.java`

**Before**

```java
private CheckoutResultResponse handleSuccessfulPayment(Order order, Transaction transaction, boolean isFromCart) {
    log.info("Payment successful for order: {}", order.getOrderNumber());
    // ... use stale order ...
    orderRepository.save(order); // -> throws StaleObjectStateException
}
```

**After**

```java
private CheckoutResultResponse handleSuccessfulPayment(Order order, Transaction transaction, boolean isFromCart) {
    // Reload order to prevent StaleObjectStateException
    Long orderId = order.getId();
    order = orderRepository.findById(orderId)
            .orElseThrow(() -> new EntityNotFoundException("Order not found: " + orderId));

    log.info("Payment successful for order: {}", order.getOrderNumber());
    // ... use fresh order ...
}
```

**Behavior & Notes**

- Eliminates race conditions between synchronous checkout response processing and asynchronous webhook calls.
- Ensures the final order status update always uses the latest database version (optimistic locking friendly).

#### Fix 9 – Concurrency Recovery (Catch-and-Recover)

- **Analysis reference**: _Refining Fix 8_
- **Date**: 2026-01-15
- **Author**: checkout-hardening-fix
- **Issue summary**:
  - Even with Fix 8 (Reload), a tiny race condition window existed between "Reload" and "Save". If a webhook completed the order in that window, `StaleObjectStateException` would still occur.
- **Files touched**:
  - `src/main/java/com/edumind/lms/modules/payment/service/CheckoutServiceImpl.java`

**Change**

Wrapped the synchronous order completion logic in a `try-catch` block for `OptimisticLockingFailureException`.

```java
try {
    return handleSuccessfulPayment(order, transaction, isFromCart);
} catch (org.springframework.dao.OptimisticLockingFailureException e) {
    // If we fail to lock, check if someone else (webhook) already finished the job.
    Order reloaded = orderRepository.findById(order.getId()).orElse(order);
    if (reloaded.getStatus() == OrderStatus.COMPLETED) {
         return buildSuccessResponse(reloaded); // Recover gracefully
    }
    throw e; // Real failure
}
```

**Behavior & Notes**

- Provides a "Success" experience to the user even if they "lost" the race condition to the background webhook.
- Eliminates the 500 error page for the "Thread A vs Thread B" edge case.
