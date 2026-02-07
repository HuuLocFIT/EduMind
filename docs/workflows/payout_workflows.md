# Payout Workflows

This document describes the payout flows implemented in the EduMind LMS system. The payout system manages instructor earnings, automated monthly payouts, and gateway integration.

---

## 1. Earnings Lifecycle Flow

Earnings progress through a lifecycle from creation to payout.

```mermaid
sequenceDiagram
    participant Order
    participant Backend
    participant Database
    participant Scheduler

    Order->>Backend: Order Completed
    Backend->>Database: Create Earnings (PENDING)
    Note over Database: Earnings held for 30 days
    
    Scheduler->>Database: Daily Check (EarningAvailabilityScheduler)
    Scheduler->>Database: Find PENDING earnings >30 days old
    Scheduler->>Database: Mark Earnings (AVAILABLE)
    Note over Database: Earnings eligible for payout
    
    Scheduler->>Database: Monthly Check (PayoutScheduler)
    Scheduler->>Database: Aggregate AVAILABLE earnings
    Scheduler->>Database: Create Payout (if ≥ minimum threshold)
    Note over Database: Earnings linked to Payout
    
    Backend->>Database: Process Payout via Gateway
    Backend->>Database: Mark Earnings (PAID)
    Note over Database: Earnings lifecycle complete
```

**Earnings Status Flow:**
- **PENDING**: Created when order completes, held for 30 days
- **AVAILABLE**: After hold period, eligible for payout
- **PAID**: After successful payout processing

---

## 2. Earning Availability Scheduler Flow

The scheduler runs daily to mark earnings as AVAILABLE after the hold period.

```mermaid
sequenceDiagram
    participant Scheduler
    participant Database

    Note over Scheduler: Runs daily at 3:00 AM
    
    Scheduler->>Database: Find PENDING earnings
    Note over Database: WHERE status = PENDING<br/>AND created_at < NOW() - 30 days
    Database-->>Scheduler: Return Earnings List
    
    alt Earnings Found
        loop For Each Earning
            Scheduler->>Database: Mark Earning (AVAILABLE)
        end
        Scheduler->>Scheduler: Batch Save All Earnings
        Note over Scheduler: Optimized batch operation
    else No Earnings
        Scheduler->>Scheduler: Skip (no earnings to process)
    end
```

**Scheduler Configuration:**
- **Cron**: `0 0 3 * * ?` (3:00 AM daily)
- **Hold Period**: 30 days (configurable via `payment.payout.hold-period-days`)
- **Optimization**: Uses repository query with date filter, batch save

---

## 3. Monthly Payout Scheduler Flow

The scheduler runs monthly to automatically create payouts for instructors with available earnings.

```mermaid
sequenceDiagram
    participant Scheduler
    participant Database
    participant PayoutService

    Note over Scheduler: Runs 1st of month at 2:00 AM
    
    Scheduler->>Database: Find Instructors with AVAILABLE Earnings
    Database-->>Scheduler: Return Instructor IDs List
    
    loop For Each Instructor
        Scheduler->>Database: Get AVAILABLE Earnings
        Scheduler->>Scheduler: Filter Earnings Not in Payouts
        Scheduler->>Scheduler: Calculate Total Amount
        
        alt Total Amount ≥ Minimum Threshold
            Scheduler->>PayoutService: Create Payout
            PayoutService->>Database: Create Payout (PENDING)
            PayoutService->>Database: Create PayoutItems (link earnings)
            Note over Database: Payout created, awaiting admin processing
        else Total Amount < Minimum Threshold
            Scheduler->>Scheduler: Skip (below threshold)
        end
    end
    
    Scheduler->>Scheduler: Log Summary (X payouts created)
```

**Scheduler Configuration:**
- **Cron**: `0 0 2 1 * ?` (2:00 AM on 1st of month)
- **Minimum Threshold**: $50 (configurable via `payment.payout.minimum-amount`)
- **Default Payment Method**: BANK_TRANSFER (admin can update)

---

## 4. Manual Payout Creation Flow (Admin)

Admins can manually create payouts for specific instructors.

```mermaid
sequenceDiagram
    participant Admin
    participant Frontend
    participant Backend
    participant Database

    Admin->>Frontend: Navigate to Payout Management
    Admin->>Frontend: Click "Create Payout"
    Frontend->>Backend: POST /api/instructors/payouts/admin
    Note over Frontend,Backend: CreatePayoutRequestDto<br/>(instructorId, paymentMethod, recipient info)
    
    Backend->>Database: Validate Instructor
    Backend->>Database: Get AVAILABLE Earnings
    Backend->>Backend: Filter Earnings Not in Payouts
    Backend->>Backend: Calculate Total Amount
    
    alt No Available Earnings
        Backend-->>Frontend: Error (No available earnings)
    else Amount < Minimum Threshold
        Backend-->>Frontend: Error (Below minimum threshold)
    else Valid Request
        Backend->>Backend: Validate Payment Method & Recipient
        alt PayPal Method
            Backend->>Backend: Validate PayPal Email
        else Bank Transfer Method
            Backend->>Backend: Validate Bank Account
        end
        
        Backend->>Database: Create Payout (PENDING)
        Backend->>Database: Create PayoutItems (link earnings)
        Backend-->>Frontend: Return Payout Details
        Frontend->>Admin: Show Payout Created
    end
```

**Manual Payout Options:**
- **All Available Earnings**: Aggregate all AVAILABLE earnings for instructor
- **Specific Earnings**: Select specific earnings by ID (via `earningIds` in request)

---

## 5. Payout Processing Flow

Admins process payouts through payment gateways.

```mermaid
sequenceDiagram
    participant Admin
    participant Backend
    participant Database
    participant PaymentGateway

    Admin->>Backend: POST /api/instructors/payouts/admin/{id}/process
    Backend->>Database: Fetch Payout (PENDING/FAILED)
    Backend->>Backend: Validate Payout Status
    Backend->>Backend: Check Retry Count (max 3)
    
    alt Retry Limit Exceeded
        Backend-->>Admin: Error (Max retries exceeded)
    else Valid Payout
        Backend->>Database: Mark Payout (PROCESSING)
        Backend->>Backend: Get Gateway (PayPal/SePay)
        Backend->>Backend: Get Recipient Info
        
        Backend->>PaymentGateway: Process Payout
        Note over Backend,PaymentGateway: recipient, amount, currency
        
        alt Gateway Success
            PaymentGateway-->>Backend: Payout Result (COMPLETED, transactionId)
            Backend->>Database: Mark Payout (COMPLETED)
            Backend->>Database: Store Gateway Transaction ID
            Backend->>Database: Mark All Earnings (PAID)
            Backend-->>Admin: Payout Processed Successfully
        else Gateway Failure
            PaymentGateway-->>Backend: Payout Result (FAILED, error)
            Backend->>Database: Mark Payout (FAILED)
            Backend->>Database: Increment Retry Count
            Backend->>Database: Store Failure Reason & Code
            Backend-->>Admin: Payout Failed (can retry)
        end
    end
```

**Retry Mechanism:**
- **Max Retries**: 3 (configurable via `payment.payout.max-retries`)
- **Retry Count**: Tracked in `Payout.retryCount`
- **Status Reset**: FAILED payouts can be updated and reprocessed

---

## 6. Payout Recipient Update Flow

Admins can update payout recipient information before processing.

```mermaid
sequenceDiagram
    participant Admin
    participant Frontend
    participant Backend
    participant Database

    Admin->>Frontend: View Payout Details
    Admin->>Frontend: Click "Update Recipient Info"
    Frontend->>Backend: PUT /api/instructors/payouts/admin/{id}
    Note over Frontend,Backend: UpdatePayoutRequestDto<br/>(paymentMethod, bankAccount, paypalEmail)
    
    Backend->>Database: Fetch Payout (PENDING/FAILED)
    Backend->>Backend: Validate Payout Status
    alt Payout Not Updatable
        Backend-->>Frontend: Error (Only PENDING/FAILED can be updated)
    else Valid Update
        Backend->>Backend: Validate Payment Method & Recipient
        Backend->>Database: Update Payout Recipient Info
        alt Payout Status = FAILED
            Backend->>Database: Reset Status (PENDING)
            Note over Backend: Allows reprocessing after update
        end
        Backend-->>Frontend: Return Updated Payout
        Frontend->>Admin: Show Updated Payout
    end
```

**Update Rules:**
- Only PENDING or FAILED payouts can be updated
- Updating FAILED payout resets status to PENDING
- Allows admin to fix recipient info and retry

---

## 7. Gateway Payout Processing

The system integrates with payment gateways to process payouts.

### PayPal Payout Processing

```mermaid
sequenceDiagram
    participant Backend
    participant PayPal
    participant Database

    Backend->>PayPal: POST /v1/payments/payouts
    Note over Backend,PayPal: Requires OAuth token<br/>Recipient email, amount, currency
    alt Payout Successful
        PayPal-->>Backend: Payout Result (COMPLETED, batchId)
        Backend->>Database: Mark Payout (COMPLETED)
        Backend->>Database: Store Gateway Transaction ID
    else Payout Failed
        PayPal-->>Backend: Error Response
        Backend->>Database: Mark Payout (FAILED)
        Note over Backend: Currently returns PENDING status<br/>Requires OAuth implementation
    end
```

**PayPal Status:**
- ⚠️ Currently returns PENDING status (requires OAuth token implementation)
- **Next Step**: Implement OAuth flow and PayPal Payouts REST API

### SePay Payout Processing

```mermaid
sequenceDiagram
    participant Backend
    participant SePay
    participant Database

    Backend->>SePay: POST /api/transfer
    Note over Backend,SePay: Bank account, amount (VND), currency
    alt Payout Successful
        SePay-->>Backend: Transfer Result (COMPLETED, transactionId)
        Backend->>Database: Mark Payout (COMPLETED)
        Backend->>Database: Store Gateway Transaction ID
    else Payout Failed
        SePay-->>Backend: Error Response
        Backend->>Database: Mark Payout (FAILED)
        Backend->>Database: Store Failure Reason
    end
```

**SePay Features:**
- ✅ Fully implemented bank transfer payouts
- ✅ VND conversion support
- ✅ Error handling

---

## 8. Instructor Payout Summary Flow

Instructors can view their payout summary and history.

```mermaid
sequenceDiagram
    participant Instructor
    participant Frontend
    participant Backend
    participant Database

    Instructor->>Frontend: Navigate to Payouts
    Frontend->>Backend: GET /api/instructors/payouts/summary
    Backend->>Database: Fetch All Payouts for Instructor
    Backend->>Database: Calculate Total Payouts (COMPLETED)
    Backend->>Database: Calculate Pending Payouts (PENDING/PROCESSING)
    Backend->>Database: Sum AVAILABLE Earnings
    Backend->>Backend: Derive Currency (from earnings or payouts)
    Backend-->>Frontend: Return PayoutSummaryDto
    Frontend->>Instructor: Show Summary (Total, Pending, Available)
    
    Instructor->>Frontend: View Payout History
    Frontend->>Backend: GET /api/instructors/payouts
    Backend->>Database: Fetch Payouts (paginated)
    Backend-->>Frontend: Return Payout List
    Frontend->>Instructor: Show Payout History
    
    Instructor->>Frontend: View Payout Details
    Frontend->>Backend: GET /api/instructors/payouts/{id}
    Backend->>Database: Fetch Payout with Items
    Backend-->>Frontend: Return Payout Details (with earnings)
    Frontend->>Instructor: Show Payout Details
```

**Payout Summary Fields:**
- **Total Payouts**: Sum of COMPLETED payouts
- **Pending Payouts**: Sum of PENDING/PROCESSING payouts
- **Available for Payout**: Sum of AVAILABLE earnings
- **Total Payout Count**: Number of all payouts
- **Last Payout Date**: Date of most recent COMPLETED payout
- **Currency**: Derived from earnings or payout history

---

## 9. Admin Payout Management Flow

Admins can view and manage all payouts.

```mermaid
sequenceDiagram
    participant Admin
    participant Frontend
    participant Backend
    participant Database

    Admin->>Frontend: Navigate to Admin Payouts
    Frontend->>Backend: GET /api/instructors/payouts/admin/pending
    Backend->>Database: Fetch PENDING Payouts
    Backend-->>Frontend: Return Pending Payouts List
    Frontend->>Admin: Show Pending Payouts
    
    Admin->>Frontend: View All Payouts
    Frontend->>Backend: GET /api/instructors/payouts/admin
    Backend->>Database: Fetch All Payouts (paginated)
    Backend-->>Frontend: Return All Payouts
    Frontend->>Admin: Show All Payouts
    
    Admin->>Frontend: Select Payout to Process
    Admin->>Frontend: Click "Process Payout"
    Frontend->>Backend: POST /api/instructors/payouts/admin/{id}/process
    Note over Frontend,Backend: Continue to Payout Processing Flow
```

---

## 10. Payout Status State Machine

```mermaid
stateDiagram-v2
    [*] --> PENDING: Payout Created
    PENDING --> PROCESSING: Admin Processes via Gateway
    PROCESSING --> COMPLETED: Gateway Success
    PROCESSING --> FAILED: Gateway Error
    FAILED --> PENDING: Admin Updates & Retries
    COMPLETED --> [*]
    FAILED --> [*]: Max Retries Exceeded
```

**Status Transitions:**
- **PENDING**: Initial state after payout creation
- **PROCESSING**: Payout being processed by gateway
- **COMPLETED**: Payout processed successfully, earnings marked as PAID
- **FAILED**: Gateway error or processing failure (can retry if < max retries)

**Status Transition Guards:**
- Only PENDING or FAILED payouts can be processed
- Only PROCESSING payouts can transition to COMPLETED or FAILED
- FAILED payouts can be updated and reset to PENDING for retry

---

## 11. Earnings Aggregation Flow

The system aggregates AVAILABLE earnings for payout creation.

```mermaid
sequenceDiagram
    participant Service
    participant Database

    Service->>Database: Find AVAILABLE Earnings
    Note over Database: WHERE instructor_id = ?<br/>AND status = AVAILABLE
    Database-->>Service: Return Earnings List
    
    Service->>Service: Filter Earnings Not in Payouts
    Note over Service: Batch check via payout_items table
    
    alt Specific Earnings Requested
        Service->>Service: Filter by Earning IDs
    end
    
    Service->>Service: Calculate Total Amount
    Note over Service: Sum of netAmount for all earnings
    
    Service->>Service: Validate Minimum Threshold
    alt Amount < Minimum
        Service->>Service: Throw Error
    else Amount >= Minimum
        Service->>Service: Proceed with Payout Creation
    end
```

**Aggregation Rules:**
- Only AVAILABLE earnings are included
- Earnings already in payouts are excluded
- Multi-currency support (currency derived from first earning)
- Minimum threshold validation ($50 default)

---

## 12. Multi-Currency Payout Flow

The system supports multi-currency payouts with automatic currency derivation.

```mermaid
sequenceDiagram
    participant Service
    participant Database

    Service->>Database: Get AVAILABLE Earnings
    Database-->>Service: Return Earnings (may have different currencies)
    
    Service->>Service: Group Earnings by Currency
    alt Single Currency
        Service->>Service: Use Currency from Earnings
    else Multiple Currencies
        Service->>Service: Derive Currency
        Note over Service: Priority:<br/>1. Most common currency in earnings<br/>2. Currency from payout history<br/>3. USD (default)
    end
    
    Service->>Database: Create Payout (with derived currency)
    Note over Database: All earnings in payout must be same currency
```

**Currency Derivation:**
- **Primary**: Currency from instructor's AVAILABLE earnings
- **Fallback**: Currency from most recent payout
- **Default**: USD if no earnings or payouts exist

---

## API Endpoints Summary

| Endpoint | Method | Description | Access |
|----------|--------|-------------|--------|
| `/api/instructors/payouts` | GET | Get instructor payout history | Instructor |
| `/api/instructors/payouts/{id}` | GET | Get payout details by ID | Instructor |
| `/api/instructors/payouts/summary` | GET | Get payout summary | Instructor |
| `/api/instructors/payouts/admin/pending` | GET | Get pending payouts | Admin |
| `/api/instructors/payouts/admin` | GET | Get all payouts | Admin |
| `/api/instructors/payouts/admin` | POST | Create payout manually | Admin |
| `/api/instructors/payouts/admin/{id}` | PUT | Update payout recipient info | Admin |
| `/api/instructors/payouts/admin/{id}/process` | POST | Process payout via gateway | Admin |

---

## Key Implementation Details

### Performance Optimizations

**Eager Loading:**
- `@EntityGraph` and `JOIN FETCH` prevent N+1 queries
- Payout items loaded with earnings in single query

**Batch Operations:**
- Payout items created via `saveAll()` instead of loop
- Earnings updates batched for performance
- Scheduler uses optimized repository queries

**Query Optimization:**
- Scheduler queries filter by status and date in database
- Batch checks for earnings already in payouts
- Efficient aggregation queries

### Earnings Hold Period

- **Default**: 30 days (configurable via `payment.payout.hold-period-days`)
- **Purpose**: Protects against refunds and chargebacks
- **Scheduler**: Runs daily at 3:00 AM to mark earnings as AVAILABLE

### Minimum Payout Threshold

- **Default**: $50 (configurable via `payment.payout.minimum-amount`)
- **Purpose**: Reduces transaction costs
- **Validation**: Applied during payout creation

### Retry Mechanism

- **Max Retries**: 3 (configurable via `payment.payout.max-retries`)
- **Tracking**: `Payout.retryCount` field
- **Enforcement**: Prevents processing if retry limit exceeded
- **Reset**: Updating FAILED payout allows reprocessing

### Status Transition Guards

- Only PENDING or FAILED payouts can be processed
- Only PROCESSING payouts can transition to COMPLETED or FAILED
- Prevents invalid state transitions

### Gateway Integration

- **PayPal**: Payout method added (requires OAuth for full implementation)
- **SePay**: Fully implemented bank transfer payouts with VND conversion
- Gateway selection based on payment method (PAYPAL → PayPal, BANK_TRANSFER → SePay)

---

## Configuration Reference

### Environment Variables

```yaml
payment:
  payout:
    minimum-amount: 50              # Minimum payout threshold
    hold-period-days: 30             # Earnings hold period
    schedule-day: 1                   # Day of month for scheduler
    schedule-hour: 2                  # Hour of day for scheduler
    max-retries: 3                    # Maximum retry attempts
    schedule-cron: "0 0 2 1 * ?"     # Monthly scheduler cron
```

### Scheduler Configuration

| Scheduler | Cron Expression | Description |
|-----------|----------------|-------------|
| `EarningAvailabilityScheduler` | `0 0 3 * * ?` | Daily at 3:00 AM |
| `PayoutScheduler` | `0 0 2 1 * ?` | 1st of month at 2:00 AM |

---

## Error Scenarios

### Payout Creation Errors

| Error | Cause | Resolution |
|-------|-------|------------|
| No available earnings | No AVAILABLE earnings found | Wait for earnings to become available |
| Amount below minimum | Total amount < minimum threshold | Wait for more earnings or adjust threshold |
| Invalid payment method | Missing recipient info | Provide bank account or PayPal email |
| Earnings already in payout | Earnings already linked to payout | Use different earnings or wait for payout completion |

### Payout Processing Errors

| Error | Cause | Resolution |
|-------|-------|------------|
| Payout not found | Invalid payout ID | Verify payout ID |
| Invalid status | Payout not PENDING or FAILED | Only PENDING/FAILED can be processed |
| Retry limit exceeded | Retry count >= max retries | Manual intervention required |
| Missing recipient info | No bank account or PayPal email | Update payout with recipient info |
| Gateway error | Payment gateway API failure | Retry or check gateway credentials |

---

## Testing Scenarios

### Payout Creation Tests

- ✅ Manual payout creation with all available earnings
- ✅ Manual payout creation with specific earnings
- ✅ Minimum threshold validation
- ✅ Multi-currency payout creation
- ✅ Duplicate earnings prevention

### Payout Processing Tests

- ✅ SePay payout processing
- ✅ PayPal payout processing (when implemented)
- ✅ Earnings marked as PAID after success
- ✅ Failed payout handling with retry count
- ✅ Retry limit enforcement

### Scheduler Tests

- ✅ Monthly payout scheduler execution
- ✅ Earning availability scheduler execution
- ✅ Batch processing optimization
- ✅ Minimum threshold filtering

### Payout Management Tests

- ✅ Payout recipient update
- ✅ Payout status transition guards
- ✅ Payout summary calculation
- ✅ Multi-currency summary

---

## Known Limitations

1. **PayPal Payouts**: Currently returns PENDING status - requires OAuth implementation
2. **Encryption**: Payout recipient data not yet encrypted (security enhancement needed)
3. **Webhooks**: Payout status webhooks not yet implemented
4. **Notifications**: Email notifications not yet implemented

---

**Last Updated**: Based on implementation in `PayoutServiceImpl`, `PayoutController`, and schedulers
**Status**: ✅ Core functionality complete, PayPal OAuth pending
