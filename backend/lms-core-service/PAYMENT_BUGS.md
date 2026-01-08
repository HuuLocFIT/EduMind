# Payment Module Bugs & Risks / Lỗi & Rủi ro Module Thanh toán

File: `com.edumind.lms.modules.payment.service.CheckoutServiceImpl.java`
Date: 2026-01-04

## 1. Silent Fail when creating Order (Critical)
**Location:** `createOrder` method (around line 258)
**Description:**
The code filters out invalid items (unpublished, already enrolled) inside the loop but does **not** check if the final list of items is empty.
**Scenario:**
1. User adds a course to Cart.
2. Admin unpublishes that course.
3. User clicks Checkout.
4. `createOrder` skips the course, creating an Order with **0 items** and `totalAmount = 0`.
5. `checkout` sees `totalAmount == 0`, treats it as a "Free Order", and completes it successfully.
**Impact:** User receives a success message but gets **no courses**.
**Fix:** Throw `CartEmptyException` or `OrderCreationException` if no valid items remain after filtering.

## 2. Enrollment Failure "Swallowed" (Critical Data Integrity)
**Location:** `createEnrollmentsForOrder` method called inside `handleSuccessfulPayment`
**Description:**
The method uses a `try-catch` block that logs the error but **does not propagate it**.
```java
try {
    enrollmentService.enrollStudent(...);
} catch (Exception e) {
    log.error(...); // Exception swallowed here
}
```
**Scenario:**
1. User pays successfully (Gateway returns success).
2. `enrollmentService.enrollStudent` fails (e.g., DB constraint, connection issue).
3. Exception is caught and ignored.
4. Transaction commits. Order is `COMPLETED`.
**Impact:** User has **paid money** but **is not enrolled** in the course.
**Fix:** Remove the try-catch or re-throw the exception to trigger a transaction rollback (or implement a compensation mechanism).

## 3. Anti-pattern: External API Call inside DB Transaction (Performance Risk)
**Location:** `checkout` and `processPayment` methods
**Description:**
The `checkout` method is annotated with `@Transactional`. It calls `processPayment`, which makes a synchronous network call to the Payment Gateway.
**Impact:**
- If the Payment Gateway is slow (e.g., takes 10s to respond), the Database Connection is held for 10s.
- Under high load, this will quickly exhaust the DB Connection Pool, causing the entire application to hang/crash (Connection Starvation).
**Fix:** Refactor to separate the "Order Creation" (Transactional) and "Payment Processing" (Non-Transactional) phases.

## 4. Null Safety / NPE Risk
**Location:** `createOrder` method
**Description:**
```java
BigDecimal effectivePrice = course.getEffectivePrice();
```
While `Course` entity might enforce non-null in DB, if a `Course` object is constructed with null values or data corruption occurs, this could throw a `NullPointerException` if `price` is null (since `getEffectivePrice` relies on it).
**Fix:** Ensure defensive coding or rely on strictly validated DTOs.
