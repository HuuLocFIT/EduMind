# Refactor Report: Order.items List -> Set

**Date:** 2026-01-12
**Issue:** `MultipleBagFetchException` required changing `Order.items` from `List` to `Set`.
**Impact:** Code expecting `List` interface (index access, assignment to `List` variables) broke.

## 1. `OrderServiceImpl.java`

**Location:** `buildOrderResponse` and `buildOrderSummary` methods.

**Before (List-based):**
```java
private OrderResponse buildOrderResponse(Order order) {
    // Type mismatch error: Set cannot be assigned to List
    List<OrderItem> items = order.getItems() != null && !order.getItems().isEmpty()
            ? order.getItems() 
            : orderItemRepository.findByOrderId(order.getId());
    ...
}

private OrderSummaryResponse buildOrderSummary(Order order, int itemCount) {
    // Method undefined error: Set does not have .get(int)
    OrderItem firstItem = order.getItems().isEmpty() ? null : order.getItems().get(0);
    ...
}
```

**After (Set/Collection-compatible):**
```java
private OrderResponse buildOrderResponse(Order order) {
    // Changed to Collection to accept both Set (from entity) and List (from repo)
    Collection<OrderItem> items = order.getItems() != null && !order.getItems().isEmpty()
            ? order.getItems()
            : orderItemRepository.findByOrderId(order.getId());
    ...
}

private OrderSummaryResponse buildOrderSummary(Order order, int itemCount) {
    // Use iterator to get first element from Set
    OrderItem firstItem = order.getItems().isEmpty() ? null : order.getItems().iterator().next();
    ...
}
```

---

## 2. `WebhookServiceImpl.java`

**Location:** `createEnrollmentsForOrder` method.

**Before (List-based):**
```java
private void createEnrollmentsForOrder(Order order) {
    List<OrderItem> orderItems = order.getItems(); // Type mismatch error
    for (OrderItem item : orderItems) { ... }
}
```

**After (Set-based):**
```java
private void createEnrollmentsForOrder(Order order) {
    Set<OrderItem> orderItems = order.getItems(); // Correct type
    for (OrderItem item : orderItems) { ... }
}
```

---

## 3. `OrderMapper.java`

**Location:** `toSummaryResponse` method.

**Before (List-based):**
```java
public OrderSummaryResponse toSummaryResponse(Order order) {
    OrderItem firstItem = order.getItems().isEmpty() ? null : order.getItems().get(0); // Method undefined error
    ...
}
```

**After (Set-based):**
```java
public OrderSummaryResponse toSummaryResponse(Order order) {
    // Use iterator to get first element
    OrderItem firstItem = order.getItems().isEmpty() ? null : order.getItems().iterator().next();
    ...
}
```
