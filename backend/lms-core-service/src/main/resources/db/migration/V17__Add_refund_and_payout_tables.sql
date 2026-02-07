-- =============================================
-- REFUND AND PAYOUT TABLES
-- EduMind LMS - Refund Requests and Instructor Payouts
-- =============================================

-- =============================================
-- 1. REFUND REQUESTS
-- Tracks refund requests from users with approval workflow
-- =============================================
CREATE TABLE payment.refund_requests (
    id BIGSERIAL PRIMARY KEY,
    order_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    
    -- Refund details
    requested_amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    reason TEXT NOT NULL,
    
    -- Status workflow
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',  -- PENDING, APPROVED, REJECTED, COMPLETED
    
    -- Timestamps
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    approved_at TIMESTAMP,
    approved_by BIGINT,  -- Admin user ID who approved
    processed_at TIMESTAMP,
    
    -- Gateway refund tracking
    refund_transaction_id VARCHAR(100),  -- Our internal refund transaction ID
    gateway_refund_id VARCHAR(100),       -- Gateway's refund ID (e.g., PayPal refund ID)
    gateway_response TEXT,                -- Gateway response JSON
    
    -- Rejection info
    rejection_reason TEXT,
    rejected_at TIMESTAMP,
    rejected_by BIGINT,  -- Admin user ID who rejected
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_refund_requests_order FOREIGN KEY (order_id)
        REFERENCES payment.orders(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX idx_refund_requests_order_id ON payment.refund_requests(order_id);
CREATE INDEX idx_refund_requests_user_id ON payment.refund_requests(user_id);
CREATE INDEX idx_refund_requests_status ON payment.refund_requests(status);
CREATE INDEX idx_refund_requests_requested_at ON payment.refund_requests(requested_at DESC);

-- =============================================
-- 2. PAYOUTS
-- Tracks instructor payouts (monthly or manual)
-- =============================================
CREATE TABLE payment.payouts (
    id BIGSERIAL PRIMARY KEY,
    payout_number VARCHAR(50) UNIQUE NOT NULL,  -- POUT-{YYYYMM}-{SEQ}
    instructor_id BIGINT NOT NULL,
    
    -- Amounts
    total_amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    
    -- Payment method
    payment_method VARCHAR(20) NOT NULL,  -- BANK_TRANSFER, PAYPAL
    
    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',  -- PENDING, PROCESSING, COMPLETED, FAILED
    
    -- Timestamps
    scheduled_at TIMESTAMP,  -- When payout was scheduled
    processed_at TIMESTAMP,  -- When payout was processed
    
    -- Gateway tracking
    gateway_transaction_id VARCHAR(100),  -- Gateway transaction ID
    gateway_response TEXT,                 -- Gateway response JSON
    
    -- Recipient info (encrypted)
    bank_account VARCHAR(255),  -- Encrypted bank account for Sepay
    paypal_email VARCHAR(255),  -- Encrypted PayPal email
    
    -- Failure tracking
    failure_reason TEXT,
    failure_code VARCHAR(50),
    retry_count INT DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_payouts_instructor_id ON payment.payouts(instructor_id);
CREATE INDEX idx_payouts_status ON payment.payouts(status);
CREATE INDEX idx_payouts_scheduled_at ON payment.payouts(scheduled_at DESC);
CREATE INDEX idx_payouts_payout_number ON payment.payouts(payout_number);

-- =============================================
-- 3. PAYOUT ITEMS
-- Links earnings to payouts (many-to-many relationship)
-- =============================================
CREATE TABLE payment.payout_items (
    id BIGSERIAL PRIMARY KEY,
    payout_id BIGINT NOT NULL,
    earning_id BIGINT NOT NULL,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_payout_items_payout FOREIGN KEY (payout_id)
        REFERENCES payment.payouts(id) ON DELETE CASCADE,
    CONSTRAINT fk_payout_items_earning FOREIGN KEY (earning_id)
        REFERENCES payment.instructor_earnings(id) ON DELETE CASCADE,
    CONSTRAINT uk_payout_items_payout_earning UNIQUE (payout_id, earning_id)
);

-- Indexes
CREATE INDEX idx_payout_items_payout_id ON payment.payout_items(payout_id);
CREATE INDEX idx_payout_items_earning_id ON payment.payout_items(earning_id);

-- =============================================
-- 4. PAYOUT SEQUENCE
-- For generating POUT-{YYYYMM}-{SEQ} with monthly reset
-- =============================================
CREATE TABLE payment.payout_sequences (
    id BIGSERIAL PRIMARY KEY,
    year_month VARCHAR(6) NOT NULL,  -- Format: YYYYMM
    current_sequence INT NOT NULL DEFAULT 0,
    
    CONSTRAINT uk_payout_sequences_year_month UNIQUE (year_month)
);

-- =============================================
-- FUNCTION: Generate Payout Number
-- =============================================
CREATE OR REPLACE FUNCTION payment.get_next_payout_number()
RETURNS VARCHAR(50) AS $$
DECLARE
    v_year_month VARCHAR(6);
    v_seq INT;
BEGIN
    v_year_month := TO_CHAR(CURRENT_DATE, 'YYYYMM');
    
    INSERT INTO payment.payout_sequences (year_month, current_sequence)
    VALUES (v_year_month, 1)
    ON CONFLICT (year_month)
    DO UPDATE SET current_sequence = payment.payout_sequences.current_sequence + 1
    RETURNING current_sequence INTO v_seq;
    
    RETURN 'POUT-' || v_year_month || '-' || LPAD(v_seq::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- COMMENTS
-- =============================================
COMMENT ON TABLE payment.refund_requests IS 'Refund requests from users with approval workflow';
COMMENT ON TABLE payment.payouts IS 'Instructor payouts (monthly or manual)';
COMMENT ON TABLE payment.payout_items IS 'Links instructor earnings to payouts';
COMMENT ON TABLE payment.payout_sequences IS 'Sequence generator for payout numbers (monthly reset)';
