# Payment Workflows

This document describes the payment flows implemented in the EduMind LMS system. The system supports two production payment gateways:

- **PayPal** - International payments (USD, EUR, GBP, etc.)
- **SePay** - Vietnam QR Bank Transfer (VND only)

---

## 1. Successful Checkout Flow (PayPal)

PayPal uses a **two-phase flow**: Order creation → User approval on PayPal → Capture via API.

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant Backend
    participant PayPal
    participant Database

    User->>Frontend: Select Course / Add to Cart
    User->>Frontend: Click Checkout
    Frontend->>Backend: POST /checkout (paymentMethod: PAYPAL)
    Backend->>Database: Validate Cart & Check Active Orders
    Backend->>Database: Create Order (PENDING) & Transaction
    Backend->>PayPal: Create PayPal Order (Orders API)
    PayPal-->>Backend: Return Order ID & Approval URL
    Backend->>Database: Store Gateway Order ID
    Backend-->>Frontend: Return Redirect URL (approvalUrl)
    Frontend->>PayPal: Redirect User to PayPal Checkout
    User->>PayPal: Login & Approve Payment
    PayPal-->>Frontend: Redirect to Success Page (with token)
    Frontend->>Backend: POST /checkout/capture?token={orderId}
    Backend->>PayPal: Capture Payment (Orders Capture API)
    PayPal-->>Backend: Capture Result (Capture ID)
    Backend->>Database: Update Transaction (SUCCESS, store Capture ID)
    Backend->>Database: Update Order (COMPLETED)
    Backend->>Database: Create Enrollment(s)
    Backend->>Database: Clear Cart Items
    Backend->>Database: Create Earnings for Instructors
    Backend->>Database: Generate Invoice
    Backend-->>Frontend: Return Success Response
    Frontend->>User: Show "Payment Successful"
```

### PayPal Webhook (Backup Confirmation)

PayPal also sends webhooks for payment events. This serves as a **backup** to ensure payment completion even if the capture endpoint has issues.

```mermaid
sequenceDiagram
    participant PayPal
    participant Backend
    participant Database

    PayPal->>Backend: POST /payments/webhook/paypal
    Note over PayPal,Backend: PAYMENT.CAPTURE.COMPLETED event
    Backend->>Backend: Verify Signature (PayPal API)
    Backend->>Database: Find Order by Order Number
    alt Order Not Yet Completed
        Backend->>Database: Update Transaction (SUCCESS)
        Backend->>Database: Update Order (COMPLETED)
        Backend->>Database: Create Enrollment(s)
        Backend->>Database: Clear Cart Items (REQUIRES_NEW txn)
        Backend->>Database: Create Earnings for Instructors
        Backend->>Database: Generate Invoice
        Backend->>Backend: Publish OrderCompletedEvent
    else Order Already Completed (Idempotent)
        Backend->>Backend: Skip Processing (Still attempt cart clear)
    end
    Backend-->>PayPal: HTTP 200 OK
```

---

## 2. Successful Checkout Flow (SePay - QR Bank Transfer)

SePay uses a **webhook-driven flow** with **automatic USD→VND conversion**: Generate QR → User transfers via banking app → SePay detects transfer → Webhook confirms payment.

> [!IMPORTANT]
> **Currency Conversion**: Course prices are stored in **USD**, but Vietnamese bank transfers require **VND**. The backend automatically converts using a configured exchange rate (`payment.sepay.usd-to-vnd-rate`).

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant Backend
    participant SePay
    participant Database
    participant Bank

    User->>Frontend: Select Course / Add to Cart
    User->>Frontend: Click Checkout
    Frontend->>Backend: POST /checkout (paymentMethod: SEPAY)
    Backend->>Database: Validate Cart & Check Active Orders
    Backend->>Database: Create Order (PENDING) in USD
    
    rect rgb(255, 245, 238)
        Note over Backend: Currency Conversion
        Backend->>Backend: Convert USD → VND (exchangeRate from config)
        Backend->>Database: Store Transaction (localAmount in VND, exchangeRate)
    end
    
    Backend->>Backend: Generate QR Code URL (qr.sepay.vn)
    Note over Backend: QR shows VND amount
    Backend-->>Frontend: Return QR URL, VND amount, exchangeRate
    Frontend->>User: Display QR Code (VND amount shown)
    User->>Bank: Open Banking App & Scan QR
    User->>Bank: Confirm Transfer in VND (content includes OrderNumber)
    Bank->>SePay: Transfer Detected
    SePay->>Backend: POST /payments/webhook/sepay
    Backend->>Backend: Validate Account Number & API Key
    Backend->>Backend: Validate VND Amount (with tolerance)
    Backend->>Database: Find Order by Order Number (from content)
    Backend->>Database: Update Transaction (SUCCESS)
    Backend->>Database: Update Order (COMPLETED)
    Backend->>Database: Create Enrollment(s)
    Backend->>Database: Clear Cart Items (REQUIRES_NEW txn)
    Backend->>Database: Create Earnings for Instructors
    Backend->>Database: Generate Invoice
    Backend->>Backend: Publish OrderCompletedEvent
    Backend-->>SePay: HTTP 200 OK
    Frontend->>Backend: GET /checkout/status/{orderId} (polling)
    Backend-->>Frontend: Return Order Status (COMPLETED)
    Frontend->>User: Show "Payment Successful"
```

### SePay Currency Conversion Details

| Field | Source | Example |
|-------|--------|---------|
| `order.totalAmount` | Course price in USD | $19.99 |
| `transaction.exchangeRate` | Config: `payment.sepay.usd-to-vnd-rate` | 25,450 |
| `transaction.localAmount` | Calculated: amount × rate | 508,755 VND |
| `transaction.localCurrency` | Always "VND" for SePay | VND |

**Amount Validation (Webhook):**
- VND is rounded to whole numbers (no decimals)
- Tolerance: `maxAmountVarianceVnd` (configurable, for bank fees)
- **Underpayment** beyond tolerance → **REJECTED** (user retries with correct amount)
- **Overpayment** → Accepted with warning log

---

## 3. Direct Checkout Flow (Buy Now)

Users can bypass the cart and purchase a single course directly.

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant Backend
    participant PaymentGateway
    participant Database

    User->>Frontend: Click "Buy Now" on Course
    Frontend->>Backend: POST /checkout/direct/preview?courseId={id}
    Backend->>Database: Validate Course & Check Enrollment
    Backend-->>Frontend: Return Preview (Price, Discount, etc.)
    Frontend->>User: Show Order Summary
    User->>Frontend: Confirm & Select Payment Method
    Frontend->>Backend: POST /checkout/direct (courseId, paymentMethod)
    Backend->>Database: Create Order (single item)
    
    alt Free Course
        Backend->>Database: Mark Order COMPLETED
        Backend->>Database: Create Enrollment
        Backend-->>Frontend: Return Success (Enrolled)
    else Paid Course
        Backend->>PaymentGateway: Process Payment
        Note right of Backend: Continue with PayPal/SePay flow
    end
```

---

## 4. Free Order Flow

When total amount is zero (free courses or 100% discount).

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant Backend
    participant Database

    User->>Frontend: Checkout Free Course(s)
    Frontend->>Backend: POST /checkout
    Backend->>Database: Create Order (PENDING)
    Backend->>Backend: Detect Free Order (totalAmount = 0)
    Backend->>Database: Set Order to PROCESSING
    Backend->>Database: Create Enrollment(s)
    Backend->>Database: Mark Order COMPLETED
    Backend->>Database: Clear Cart Items
    Backend-->>Frontend: Return Success Response
    Frontend->>User: Show "Enrollment Successful"
```

---

## 5. Failed Checkout Flow

Handles payment failures from various sources.

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant Backend
    participant PaymentGateway
    participant Database

    User->>Frontend: Click Checkout
    Frontend->>Backend: Initiate Checkout
    Backend->>Database: Create Order & Transaction

    alt Gateway Error
        Backend->>PaymentGateway: Process Payment
        PaymentGateway-->>Backend: Error Response
        Backend->>Database: Update Transaction (FAILED)
        Backend->>Database: Update Order (FAILED)
        Backend-->>Frontend: Return Error (canRetry: true)
    else Webhook Reports Failure
        PaymentGateway->>Backend: Webhook (FAILED/DENIED)
        Backend->>Database: Update Transaction (FAILED)
        Backend->>Database: Update Order (FAILED)
    else User Cancels on Gateway
        User->>PaymentGateway: Cancel Payment
        PaymentGateway-->>Frontend: Redirect to Cancel URL
        Frontend->>Backend: POST /checkout/cancel?orderId={id}
        Backend->>Database: Mark Order CANCELLED
        Backend->>Database: Mark Transaction FAILED (USER_CANCELLED)
    end

    Frontend->>User: Show "Payment Failed" / Retry Option
```

---

## 6. Payment Retry Flow

Users can retry failed payments (max 3 attempts).

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant Backend
    participant PaymentGateway
    participant Database

    User->>Frontend: View Order History
    Frontend->>User: Show Failed Order with "Retry" Button
    User->>Frontend: Click Retry Payment
    Frontend->>Backend: POST /orders/{id}/retry (paymentMethod)
    Backend->>Database: Validate Order (PENDING/FAILED)
    Backend->>Database: Check Retry Count (max 3)
    Backend->>Database: Reset Order to PENDING
    Backend->>Database: Increment Retry Count
    Backend->>PaymentGateway: Process Payment (new attempt)
    
    alt Success
        Backend-->>Frontend: Return Payment URL
        Note right of Backend: Continue normal payment flow
    else Retry Limit Exceeded
        Backend-->>Frontend: Error (MAX_RETRIES_EXCEEDED)
        Frontend->>User: Show "Too many attempts, contact support"
    end
```

---

## 7. Order Expiration Flow

Orders expire if payment is not completed within the time limit.

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant Backend
    participant Database

    Note over Backend,Database: Order created with expiresAt timestamp

    User->>Frontend: Attempt Checkout (new order)
    Frontend->>Backend: POST /checkout
    Backend->>Database: Check for Active Orders
    
    alt Existing Order Not Expired
        Backend-->>Frontend: Error (CHECKOUT_IN_PROGRESS)
        Frontend->>User: "Complete or cancel existing order"
    else Existing Order Expired
        Backend->>Database: Mark Expired Order as FAILED
        Backend->>Database: Create New Order
        Backend-->>Frontend: Continue with new order
    end
```

---

## 8. Order Cancellation Flow (User)

Users can cancel pending orders to start fresh.

```mermaid
graph TD
    A[User views Order History] --> A2[Click View Details]
    A2 --> A3[User views Order Details]
    A3 --> B{Order Status?}
    B -- PENDING/PROCESSING --> C[Click Cancel Button]
    C --> D[Confirm Cancellation]
    D --> E["Call API: POST /checkout/cancel?orderId={id}"]
    E --> F[Backend Updates Order to CANCELLED]
    F --> G["Frontend Updates UI to 'Cancelled'"]
    G --> H[User can start new checkout]
    B -- COMPLETED --> I["Cannot Cancel (Request Refund instead)"]
    B -- CANCELLED/FAILED --> J[No Action Available]
```

---

## 9. Order Refund Flow

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant Backend
    participant Admin

    User->>Frontend: Request Refund (Order Detail)
    Frontend->>Backend: POST /orders/{id}/refund
    Backend->>Database: Update Order Status (REFUND_REQUESTED)
    Admin->>Backend: Review Refund Request
    alt Approved
        Admin->>Backend: Approve Refund
        Backend->>Database: Update Order (REFUNDED)
        Backend->>Database: Update refundReason & refundedAt
        Backend->>Database: Revoke Enrollment
        Backend->>User: Notification (Refund Approved)
    else Rejected
        Admin->>Backend: Reject Refund
        Backend->>Database: Update Order (COMPLETED)
        Backend->>User: Notification (Refund Rejected)
    end
```

---

## 10. Webhook Security & Verification

### PayPal Webhook Verification

```mermaid
sequenceDiagram
    participant PayPal
    participant Backend
    participant PayPalAPI

    PayPal->>Backend: POST /payments/webhook/paypal
    Note over PayPal,Backend: Headers: PAYPAL-TRANSMISSION-ID,<br/>PAYPAL-TRANSMISSION-SIG, etc.
    Backend->>PayPalAPI: POST /v1/notifications/verify-webhook-signature
    PayPalAPI-->>Backend: {verification_status: SUCCESS/FAILURE}
    
    alt Signature Valid
        Backend->>Backend: Process Webhook
        Backend-->>PayPal: HTTP 200 OK
    else Signature Invalid
        Backend-->>PayPal: HTTP 400 Bad Request
    end
```

### SePay Webhook Verification

```mermaid
sequenceDiagram
    participant SePay
    participant Backend

    SePay->>Backend: POST /payments/webhook/sepay
    Note over SePay,Backend: Header: Authorization: Apikey {SECRET}
    Backend->>Backend: Validate Account Number
    Backend->>Backend: Validate Transfer Type (in/out)
    Backend->>Backend: Verify API Key matches configured secret
    
    alt Validation Passed
        Backend->>Backend: Process Webhook
        Backend-->>SePay: {"success": true}
    else Validation Failed
        Backend-->>SePay: HTTP 400 {"success": false}
    end
```

---

## API Endpoints Summary

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/checkout/preview` | POST | Preview cart checkout |
| `/checkout` | POST | Process cart checkout |
| `/checkout/direct/preview` | POST | Preview single course checkout |
| `/checkout/direct` | POST | Process single course checkout |
| `/checkout/capture` | POST | Capture PayPal payment |
| `/checkout/cancel` | POST | Cancel pending order |
| `/checkout/status/{orderId}` | GET | Poll for payment status (SePay) |
| `/payments/webhook/paypal` | POST | PayPal webhook endpoint |
| `/payments/webhook/sepay` | POST | SePay webhook endpoint |
| `/payments/webhook/health` | GET | Webhook health check |

---

## Order Status State Machine

```mermaid
stateDiagram-v2
    [*] --> PENDING: Order Created
    PENDING --> PROCESSING: Payment Initiated
    PROCESSING --> COMPLETED: Payment Successful
    PROCESSING --> FAILED: Payment Failed
    PENDING --> FAILED: Expired / Gateway Error
    PENDING --> CANCELLED: User Cancelled
    COMPLETED --> REFUND_REQUESTED: User Requests Refund
    REFUND_REQUESTED --> REFUNDED: Admin Approves
    REFUND_REQUESTED --> COMPLETED: Admin Rejects
    FAILED --> PENDING: Retry Payment
```

---

## Key Implementation Details

### Race Condition Handling

**PayPal only** uses pessimistic locking to prevent race conditions:

| Gateway | Race Condition? | Why |
|---------|-----------------|-----|
| **PayPal** | ✅ Yes | Capture endpoint (`/checkout/capture`) and webhook (`/webhook/paypal`) can fire simultaneously after user approval |
| **SePay** | ❌ No | Only webhook completes the order - no parallel capture endpoint exists |

**PayPal solution:** `TransactionRepository.findByGatewayIdForUpdate()` with `@Lock(PESSIMISTIC_WRITE)` ensures only one thread processes the capture.

- Idempotency checks prevent duplicate processing of completed orders

### Cart Clearing Transaction Strategy
Cart clearing uses different strategies depending on the flow:

| Flow | Strategy | Why |
|------|----------|-----|
| **Webhook** (PayPal/SePay) | `REQUIRES_NEW` transaction | Ensures cart is cleared even if invoice/event fails and causes rollback |
| **Checkout** (UI Capture) | Outside main transaction | Order commit happens first via `TransactionTemplate`, then cart clear runs in separate call |

This design ensures **cart is always cleared** regardless of downstream failures (invoice generation, event publishing).

### Cart Signature Validation
- Optional cart signature comparison detects cart changes between preview and checkout
- Returns `CART_CHANGED` error if prices or items have changed

### Active Order Prevention
- Only one active (PENDING/PROCESSING) order per user is allowed
- New checkout attempts check for existing orders and either:
  - Return the existing order if still valid
  - Mark as FAILED if expired, allowing new checkout

### Payment Method Policies
- **All course prices are stored in USD**
- Each payment method defines supported currencies and conversion behavior:
  - **PayPal**: USD, EUR, GBP, etc. (international currencies)
  - **SePay**: Accepts USD (converts to VND at checkout using configured exchange rate)

