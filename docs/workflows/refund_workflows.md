# Refund Workflows

This document describes the refund flows implemented in the EduMind LMS system. The refund system supports automatic and manual approval workflows with gateway integration.

---

## 1. Refund Request Flow (User)

Users can request refunds for completed orders within the 30-day refund window.

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant Backend
    participant Database

    User->>Frontend: View Order Details
    User->>Frontend: Click "Request Refund"
    Frontend->>Backend: GET /api/payments/refunds/policy?orderId={id}
    Backend->>Database: Fetch Order & Calculate Policy
    Backend-->>Frontend: Return Refund Policy (eligibility, amount)
    Frontend->>User: Show Refund Policy & Form
    User->>Frontend: Enter Reason & Confirm
    Frontend->>Backend: POST /api/payments/refunds/request
    Backend->>Database: Validate Order (COMPLETED, user ownership)
    Backend->>Database: Check Duplicate Refund (unique constraint)
    Backend->>Backend: Calculate Refund Policy
    alt Not Eligible
        Backend-->>Frontend: Error (eligibility reason)
    else Eligible
        Backend->>Database: Create RefundRequest (PENDING)
        alt Auto-Approve Eligible
            Backend->>Database: Mark RefundRequest (APPROVED)
            Backend->>Backend: Process Refund Immediately
            Note over Backend: Continue to Process Refund Flow
        else Requires Admin Approval
            Backend-->>Frontend: Success (PENDING - awaiting admin)
        end
    end
```

### Refund Policy Calculation

The system calculates refund eligibility based on:
- **Days since purchase**: Must be ≤ 30 days
- **Course access percentage**: Calculated from enrollments (ACTIVE, COMPLETED, DROPPED)

**Policy Rules:**
- **Auto-approve**: ≤7 days AND 0% course access → Full refund
- **Admin approval**: ≤30 days AND ≤50% course access → Full refund
- **Partial refund**: ≤30 days AND >50% course access → Prorated refund
- **Rejected**: >30 days since purchase

**Course Access Calculation:**
- ACTIVE enrollments: Uses `progressPercentage`
- COMPLETED enrollments: Counted as 100% access
- DROPPED enrollments: Uses recorded progress percentage
- Average across all courses in the order

---

## 2. Auto-Approval Refund Flow

Refunds that meet auto-approval criteria are processed immediately without admin intervention.

```mermaid
sequenceDiagram
    participant User
    participant Backend
    participant Database
    participant PaymentGateway

    User->>Backend: Request Refund (≤7 days, 0% access)
    Backend->>Database: Create RefundRequest (PENDING)
    Backend->>Backend: Check Policy (auto-approve eligible)
    Backend->>Database: Mark RefundRequest (APPROVED)
    Backend->>Database: Find Transaction (SUCCESS)
    Backend->>PaymentGateway: Process Refund
    alt PayPal Gateway
        PaymentGateway-->>Backend: Refund Result (COMPLETED)
        Backend->>Database: Mark RefundRequest (COMPLETED)
        Backend->>Database: Update Order (REFUNDED)
        Backend->>Database: Update Transaction (REFUNDED)
        Backend->>Database: Mark Earnings (REFUNDED)
        Backend->>Database: Revoke Enrollments (DROPPED)
        Backend-->>User: Refund Processed
    else SePay Gateway
        PaymentGateway-->>Backend: Refund Result (PENDING - manual)
        Backend->>Database: Mark RefundRequest (FAILED)
        Note over Backend: Admin must process manually
    end
```

---

## 3. Admin Approval Refund Flow

Refunds requiring admin approval go through a review process.

```mermaid
sequenceDiagram
    participant User
    participant Admin
    participant Frontend
    participant Backend
    participant Database
    participant PaymentGateway

    User->>Backend: Request Refund (requires approval)
    Backend->>Database: Create RefundRequest (PENDING)
    Backend-->>User: Refund Request Submitted

    Admin->>Frontend: View Admin Dashboard
    Admin->>Frontend: Navigate to Pending Refunds
    Frontend->>Backend: GET /api/payments/refunds/admin/pending
    Backend->>Database: Fetch PENDING RefundRequests
    Backend-->>Frontend: Return Pending Refunds List
    Admin->>Frontend: Review Refund Details
    Admin->>Frontend: Click Approve/Reject

    alt Admin Approves
        Frontend->>Backend: POST /api/payments/refunds/admin/{id}/approve
        Backend->>Database: Mark RefundRequest (APPROVED)
        Backend->>Database: Find Transaction (SUCCESS)
        Backend->>PaymentGateway: Process Refund
        alt Gateway Success
            PaymentGateway-->>Backend: Refund Result (COMPLETED)
            Backend->>Database: Mark RefundRequest (COMPLETED)
            Backend->>Database: Update Order (REFUNDED)
            Backend->>Database: Update Transaction (REFUNDED)
            Backend->>Database: Mark Earnings (REFUNDED)
            Backend->>Database: Revoke Enrollments (if full refund)
            Backend-->>Admin: Refund Processed
        else Gateway Failure
            PaymentGateway-->>Backend: Refund Result (FAILED/PENDING)
            Backend->>Database: Mark RefundRequest (FAILED)
            Backend-->>Admin: Refund Failed (requires manual processing)
        end
    else Admin Rejects
        Frontend->>Backend: POST /api/payments/refunds/admin/{id}/reject
        Backend->>Database: Mark RefundRequest (REJECTED)
        Backend->>Database: Store Rejection Reason
        Backend-->>Admin: Refund Rejected
        Backend-->>User: Notification (Refund Rejected)
    end
```

---

## 4. Partial Refund Flow

When course access exceeds 50%, users receive a prorated refund based on access percentage.

```mermaid
sequenceDiagram
    participant User
    participant Backend
    participant Database
    participant PaymentGateway

    User->>Backend: Request Refund (>50% access)
    Backend->>Backend: Calculate Course Access (e.g., 60%)
    Backend->>Backend: Calculate Partial Refund (40% of order amount)
    Backend->>Database: Create RefundRequest (PENDING, partial amount)
    Backend->>Database: Mark RefundRequest (APPROVED) [after admin approval]
    Backend->>Database: Find Transaction (SUCCESS)
    Backend->>PaymentGateway: Process Refund (partial amount)
    PaymentGateway-->>Backend: Refund Result (COMPLETED)
    Backend->>Database: Mark RefundRequest (COMPLETED)
    Backend->>Database: Update Order (REFUNDED)
    Backend->>Database: Update Transaction (REFUNDED)
    Backend->>Database: Mark Earnings (REFUNDED - proportional)
    Note over Backend: Enrollments remain ACTIVE (partial refund)
    Backend-->>User: Partial Refund Processed
```

**Partial Refund Calculation:**
- Access ratio = `courseAccessPercentage / 100`
- Refund ratio = `1 - accessRatio`
- Refund amount = `order.totalAmount × refundRatio`

**Earnings Adjustment:**
- For partial refunds, earnings are marked as REFUNDED proportionally
- If earnings are already PAID, system logs warning for manual recovery

---

## 5. Gateway Refund Processing

The system integrates with payment gateways to process refunds automatically or manually.

### PayPal Refund Processing

```mermaid
sequenceDiagram
    participant Backend
    participant PayPal
    participant Database

    Backend->>PayPal: POST /v1/payments/capture/{captureId}/refund
    Note over Backend,PayPal: Amount, currency, reason
    alt Refund Successful
        PayPal-->>Backend: Refund Result (COMPLETED, refundId)
        Backend->>Database: Mark RefundRequest (COMPLETED)
        Backend->>Database: Store Gateway Refund ID
        Backend->>Database: Update Order & Transaction
    else Refund Failed
        PayPal-->>Backend: Error Response
        Backend->>Database: Mark RefundRequest (FAILED)
        Note over Backend: Admin can retry
    end
```

### SePay Refund Processing

```mermaid
sequenceDiagram
    participant Backend
    participant SePay
    participant Database

    Backend->>SePay: Process Refund Request
    Note over Backend,SePay: Bank transfer limitation
    SePay-->>Backend: Refund Result (PENDING - manual)
    Backend->>Database: Mark RefundRequest (FAILED)
    Note over Backend: Admin must process manually via bank transfer
    Backend->>Backend: Log Manual Processing Required
```

**SePay Limitation:**
- Bank transfers cannot be automatically reversed
- System marks refund as FAILED with "Manual refund required" message
- Admin must process refund manually via bank transfer

---

## 6. Refund Processing with Earnings Recovery

When processing refunds, the system handles earnings that may already be paid out to instructors.

```mermaid
sequenceDiagram
    participant Backend
    participant Database

    Backend->>Database: Find Earnings for Order
    Backend->>Backend: Check Earning Status
    alt Full Refund
        loop For Each Earning
            alt Earning Status = PAID
                Backend->>Backend: Log Warning (MANUAL RECOVERY REQUIRED)
                Note over Backend: Admin must clawback from instructor
            else Earning Status = AVAILABLE/PENDING
                Backend->>Database: Mark Earning (REFUNDED)
            end
        end
    else Partial Refund
        Backend->>Backend: Calculate Proportional Refund
        loop For Each Earning (proportional)
            alt Earning Status = PAID
                Backend->>Backend: Log Warning (MANUAL RECOVERY REQUIRED)
            else Earning Status = AVAILABLE/PENDING
                Backend->>Database: Mark Earning (REFUNDED)
            end
        end
    end
```

**PAID Earnings Handling:**
- System logs warning: "MANUAL RECOVERY REQUIRED"
- Admin must manually recover funds from instructor
- Refund still processes, but earnings remain marked as PAID

---

## 7. Enrollment Revocation Flow

Full refunds automatically revoke course enrollments.

```mermaid
sequenceDiagram
    participant Backend
    participant Database

    Backend->>Backend: Check if Full Refund
    alt Full Refund (amount >= order.totalAmount)
        Backend->>Database: Find All Enrollments for Order
        loop For Each Enrollment
            alt Enrollment Status = ACTIVE
                Backend->>Database: Update Enrollment (DROPPED)
                Note over Backend: User loses course access
            else Enrollment Status = COMPLETED/DROPPED
                Backend->>Backend: Skip (already inactive)
            end
        end
    else Partial Refund
        Note over Backend: Enrollments remain ACTIVE
    end
```

**Enrollment Revocation Rules:**
- Only ACTIVE enrollments are revoked
- COMPLETED enrollments are not revoked (already finished)
- DROPPED enrollments are not changed (already inactive)

---

## 8. Duplicate Refund Prevention

The system prevents duplicate refund requests using database constraints and optimistic locking.

```mermaid
sequenceDiagram
    participant User1
    participant User2
    participant Backend
    participant Database

    User1->>Backend: Request Refund (Order 123)
    Backend->>Database: Create RefundRequest (PENDING)
    Database-->>Backend: Success

    User2->>Backend: Request Refund (Order 123) [concurrent]
    Backend->>Database: Create RefundRequest (PENDING)
    Database-->>Backend: DataIntegrityViolationException
    Note over Database: UNIQUE constraint on order_id
    Backend->>Database: Find Existing RefundRequest
    Backend-->>User2: Return Existing Refund Request
```

**Protection Mechanisms:**
- **Database UNIQUE constraint** on `order_id` prevents duplicates
- **Optimistic locking** via `@Version` prevents concurrent updates
- Concurrent requests return existing refund request instead of error

---

## 9. Refund Status State Machine

```mermaid
stateDiagram-v2
    [*] --> PENDING: User Requests Refund
    PENDING --> APPROVED: Auto-approve or Admin Approves
    PENDING --> REJECTED: Admin Rejects
    APPROVED --> COMPLETED: Gateway Processes Successfully
    APPROVED --> FAILED: Gateway Error / Manual Processing Required
    REJECTED --> [*]
    COMPLETED --> [*]
    FAILED --> [*]: Admin Manual Processing
```

**Status Transitions:**
- **PENDING**: Initial state after refund request
- **APPROVED**: Auto-approved or admin-approved, ready for processing
- **REJECTED**: Admin rejected the refund request
- **COMPLETED**: Refund processed successfully via gateway
- **FAILED**: Gateway error or manual processing required (SePay)

---

## 10. Refund Policy Details

### Policy Configuration

| Configuration | Default | Description |
|--------------|---------|-------------|
| `payment.refund.auto-approve-days` | 7 | Days within which refunds auto-approve (if 0% access) |
| `payment.refund.max-refund-days` | 30 | Maximum days since purchase for refund eligibility |
| `payment.refund.partial-refund-threshold` | 50 | Course access percentage threshold for partial refunds |

### Policy Calculation Examples

| Days Since Purchase | Course Access | Refund Amount | Approval Required |
|---------------------|---------------|---------------|-------------------|
| 5 days | 0% | 100% (Full) | Auto-approve |
| 15 days | 30% | 100% (Full) | Admin approval |
| 20 days | 60% | 40% (Partial) | Admin approval |
| 35 days | Any | 0% (Not eligible) | N/A |

### Policy Amount Validation

- User-requested amount is automatically clamped to policy-eligible maximum
- System prevents policy bypass by validating against `eligibleRefundAmount`
- If user requests more than eligible, system uses eligible amount

---

## API Endpoints Summary

| Endpoint | Method | Description | Access |
|----------|--------|-------------|--------|
| `/api/payments/refunds/request` | POST | Request refund for an order | User |
| `/api/payments/refunds/policy` | GET | Get refund policy for an order | User |
| `/api/payments/refunds/my-refunds` | GET | Get user's refund history | User |
| `/api/payments/refunds/{id}` | GET | Get refund details by ID | User |
| `/api/payments/refunds/admin/pending` | GET | Get pending refunds | Admin |
| `/api/payments/refunds/admin/{id}/approve` | POST | Approve refund request | Admin |
| `/api/payments/refunds/admin/{id}/reject` | POST | Reject refund request | Admin |

---

## Key Implementation Details

### Optimistic Locking

- `RefundRequest` entity uses `@Version` for concurrent update protection
- Prevents race conditions when multiple admins process the same refund

### Transaction Isolation

- Refund processing uses proper transaction boundaries
- Gateway calls are made within transactions to ensure data consistency
- Earnings updates and enrollment revocation are atomic

### Gateway Integration

- **PayPal**: Automatic refund processing via REST API
- **SePay**: Manual processing workflow (bank transfer limitation)
- Gateway failures are tracked with FAILED status for admin retry

### Course Access Calculation

- Includes ACTIVE enrollments with progress percentage
- Includes COMPLETED enrollments (counted as 100% access)
- Includes DROPPED enrollments with recorded progress
- Average calculated across all courses in the order

### Earnings Recovery

- PAID earnings trigger manual recovery warnings
- System logs detailed information for admin intervention
- Refund still processes, but earnings remain marked as PAID

### Duplicate Prevention

- Database UNIQUE constraint on `order_id`
- Concurrent requests return existing refund instead of error
- Optimistic locking prevents concurrent status updates

---

## Error Scenarios

### Refund Request Errors

| Error | Cause | Resolution |
|-------|-------|------------|
| Order not found | Invalid order ID or user mismatch | Verify order ownership |
| Order not completed | Order status is not COMPLETED | Only completed orders can be refunded |
| Refund window expired | >30 days since purchase | Refund not eligible |
| Duplicate refund | Refund already exists for order | Return existing refund request |
| Amount exceeds eligible | Requested amount > policy maximum | System clamps to eligible amount |

### Refund Processing Errors

| Error | Cause | Resolution |
|-------|-------|------------|
| No transaction found | Order has no successful transaction | Verify order payment status |
| Gateway error | Payment gateway API failure | Retry or process manually |
| Manual processing required | SePay bank transfer limitation | Admin processes via bank transfer |
| Earnings already paid | Instructor already received payout | Manual recovery required |

---

## Testing Scenarios

### Refund Request Tests

- ✅ Auto-approve refund (≤7 days, 0% access)
- ✅ Admin approval refund (≤30 days, ≤50% access)
- ✅ Partial refund (≤30 days, >50% access)
- ✅ Refund rejection (>30 days)
- ✅ Duplicate refund prevention
- ✅ Completed course refund prevention
- ✅ Policy amount validation

### Refund Processing Tests

- ✅ PayPal automatic refund
- ✅ SePay manual refund workflow
- ✅ Enrollment revocation on full refund
- ✅ Partial refund earnings adjustment
- ✅ PAID earnings recovery handling
- ✅ Failed refund status tracking

---

**Last Updated**: Based on implementation in `RefundServiceImpl` and `RefundController`
**Status**: ✅ Core functionality complete
