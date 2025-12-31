-- =============================================
-- PAYMENT MODULE SCHEMA
-- EduMind LMS - Payment & Order Management
-- =============================================

-- Ensure schema exists (Flyway should create it, but just in case)
CREATE SCHEMA IF NOT EXISTS payment;

-- =============================================
-- 1. PLATFORM CONFIGURATION
-- Stores configurable values (platform fee, min/max price, etc.)
-- =============================================
CREATE TABLE payment.platform_config (
    id BIGSERIAL PRIMARY KEY,
    config_key VARCHAR(100) UNIQUE NOT NULL,
    config_value VARCHAR(500) NOT NULL,
    description VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default configurations
INSERT INTO payment.platform_config (config_key, config_value, description) VALUES
    ('PLATFORM_FEE_PERCENT', '20', 'Platform fee percentage (teacher receives 100 - this %)'),
    ('MIN_COURSE_PRICE', '0', 'Minimum course price in USD (0 = free allowed)'),
    ('MAX_COURSE_PRICE', '500', 'Maximum course price in USD'),
    ('DEFAULT_CURRENCY', 'USD', 'Default currency for pricing'),
    ('COMPANY_NAME', 'EduMind Inc.', 'Company name for invoices'),
    ('COMPANY_ADDRESS', '123 Education Street, Learning City, ED 12345', 'Company address for invoices'),
    ('COMPANY_TAX_ID', 'TAX-EDU-123456789', 'Company Tax ID for invoices'),
    ('COMPANY_EMAIL', 'support@edumind.com', 'Support email for invoices'),
    ('COMPANY_PHONE', '+1 (555) 123-4567', 'Support phone for invoices');

-- =============================================
-- 2. SHOPPING CART
-- Temporary storage for items user wants to purchase
-- =============================================
CREATE TABLE payment.carts (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uk_carts_user UNIQUE (user_id)
);

CREATE TABLE payment.cart_items (
    id BIGSERIAL PRIMARY KEY,
    cart_id BIGINT NOT NULL,
    course_id BIGINT NOT NULL,

    -- Snapshot of price at time of adding (for display, not final charge)
    price_snapshot DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',

    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_cart_items_cart FOREIGN KEY (cart_id)
        REFERENCES payment.carts(id) ON DELETE CASCADE,
    CONSTRAINT uk_cart_items_cart_course UNIQUE (cart_id, course_id)
);

-- Index for fast lookup
CREATE INDEX idx_cart_items_cart_id ON payment.cart_items(cart_id);
CREATE INDEX idx_cart_items_course_id ON payment.cart_items(course_id);

-- =============================================
-- 3. ORDERS
-- Finalized purchase records
-- =============================================
CREATE TABLE payment.orders (
    id BIGSERIAL PRIMARY KEY,
    order_number VARCHAR(50) UNIQUE NOT NULL,  -- ORD-{YYYYMMDD}-{SEQ}
    user_id BIGINT NOT NULL,

    -- Pricing
    subtotal DECIMAL(10,2) NOT NULL,           -- Sum of all items before discount
    discount_total DECIMAL(10,2) DEFAULT 0,    -- Total discounts applied
    total_amount DECIMAL(10,2) NOT NULL,       -- Final amount to charge
    currency VARCHAR(3) DEFAULT 'USD',

    -- Payment info
    payment_method VARCHAR(20),                -- FREE, MOCK, PAYPAL, SEPAY

    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',  -- PENDING, COMPLETED, FAILED, REFUNDED, CANCELLED

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,

    -- Metadata (for debugging/audit)
    ip_address VARCHAR(45),
    user_agent VARCHAR(500)
);

-- Indexes
CREATE INDEX idx_orders_user_id ON payment.orders(user_id);
CREATE INDEX idx_orders_status ON payment.orders(status);
CREATE INDEX idx_orders_created_at ON payment.orders(created_at DESC);
CREATE INDEX idx_orders_order_number ON payment.orders(order_number);

-- =============================================
-- 4. ORDER ITEMS
-- Individual courses in an order
-- =============================================
CREATE TABLE payment.order_items (
    id BIGSERIAL PRIMARY KEY,
    order_id BIGINT NOT NULL,
    course_id BIGINT NOT NULL,

    -- Instructor info (snapshot at purchase time)
    instructor_id BIGINT NOT NULL,
    instructor_name VARCHAR(255),

    -- Course info (snapshot at purchase time)
    course_title VARCHAR(255) NOT NULL,
    course_thumbnail_url VARCHAR(500),

    -- Pricing (at time of purchase)
    original_price DECIMAL(10,2) NOT NULL,     -- Original price
    discount_amount DECIMAL(10,2) DEFAULT 0,   -- Discount applied
    final_price DECIMAL(10,2) NOT NULL,        -- Price after discount
    currency VARCHAR(3) DEFAULT 'USD',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_order_items_order FOREIGN KEY (order_id)
        REFERENCES payment.orders(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX idx_order_items_order_id ON payment.order_items(order_id);
CREATE INDEX idx_order_items_course_id ON payment.order_items(course_id);
CREATE INDEX idx_order_items_instructor_id ON payment.order_items(instructor_id);

-- =============================================
-- 5. TRANSACTIONS (Payment Records)
-- Actual payment transaction history
-- =============================================
CREATE TABLE payment.transactions (
    id BIGSERIAL PRIMARY KEY,
    order_id BIGINT NOT NULL,

    -- Transaction details
    transaction_number VARCHAR(50) UNIQUE NOT NULL,  -- TXN-{YYYYMMDD}-{SEQ}

    -- Gateway info
    gateway VARCHAR(20) NOT NULL,              -- MOCK, PAYPAL, SEPAY
    gateway_transaction_id VARCHAR(100),       -- ID from payment gateway
    gateway_response TEXT,                     -- JSON response from gateway

    -- Amount
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',

    -- For SePay: VND conversion
    exchange_rate DECIMAL(15,6),               -- e.g., 24500.000000
    local_amount DECIMAL(15,2),                -- Amount in local currency
    local_currency VARCHAR(3),                 -- e.g., VND

    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',  -- PENDING, SUCCESS, FAILED, REFUNDED
    failure_reason VARCHAR(500),               -- Reason if failed

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP,

    CONSTRAINT fk_transactions_order FOREIGN KEY (order_id)
        REFERENCES payment.orders(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX idx_transactions_order_id ON payment.transactions(order_id);
CREATE INDEX idx_transactions_status ON payment.transactions(status);
CREATE INDEX idx_transactions_gateway ON payment.transactions(gateway);
CREATE INDEX idx_transactions_gateway_txn_id ON payment.transactions(gateway_transaction_id);

-- =============================================
-- 6. INVOICES
-- Invoice records with PDF links
-- =============================================
CREATE TABLE payment.invoices (
    id BIGSERIAL PRIMARY KEY,
    invoice_number VARCHAR(50) UNIQUE NOT NULL,  -- INV-{YYYYMM}-{SEQ}
    order_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,

    -- Buyer info (snapshot)
    buyer_name VARCHAR(255) NOT NULL,
    buyer_email VARCHAR(255) NOT NULL,

    -- Amounts
    subtotal DECIMAL(10,2) NOT NULL,
    discount_total DECIMAL(10,2) DEFAULT 0,
    tax_amount DECIMAL(10,2) DEFAULT 0,        -- Tax (0% for now)
    tax_rate DECIMAL(5,2) DEFAULT 0,           -- Tax rate percentage
    total_amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',

    -- PDF storage
    pdf_url VARCHAR(500),                      -- Cloudinary URL
    pdf_public_id VARCHAR(255),                -- Cloudinary public_id

    -- Status
    status VARCHAR(20) DEFAULT 'GENERATED',    -- GENERATED, SENT, VIEWED

    -- Timestamps
    issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sent_at TIMESTAMP,                         -- When email was sent
    viewed_at TIMESTAMP,                       -- When user viewed/downloaded

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_invoices_order FOREIGN KEY (order_id)
        REFERENCES payment.orders(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX idx_invoices_order_id ON payment.invoices(order_id);
CREATE INDEX idx_invoices_user_id ON payment.invoices(user_id);
CREATE INDEX idx_invoices_invoice_number ON payment.invoices(invoice_number);

-- =============================================
-- 7. INVOICE SEQUENCES
-- For generating INV-{YYYYMM}-{SEQ} with monthly reset
-- =============================================
CREATE TABLE payment.invoice_sequences (
    id BIGSERIAL PRIMARY KEY,
    year_month VARCHAR(6) NOT NULL,            -- Format: YYYYMM
    current_sequence INT NOT NULL DEFAULT 0,

    CONSTRAINT uk_invoice_sequences_year_month UNIQUE (year_month)
);

-- =============================================
-- 8. INSTRUCTOR EARNINGS
-- Track earnings for each instructor per sale
-- =============================================
CREATE TABLE payment.instructor_earnings (
    id BIGSERIAL PRIMARY KEY,
    instructor_id BIGINT NOT NULL,
    order_item_id BIGINT NOT NULL,
    order_id BIGINT NOT NULL,
    course_id BIGINT NOT NULL,

    -- Amounts
    gross_amount DECIMAL(10,2) NOT NULL,       -- Original sale price
    platform_fee_percent DECIMAL(5,2) NOT NULL, -- Platform fee % at time of sale
    platform_fee_amount DECIMAL(10,2) NOT NULL, -- Platform fee amount
    net_amount DECIMAL(10,2) NOT NULL,         -- Amount instructor receives
    currency VARCHAR(3) DEFAULT 'USD',

    -- Status
    status VARCHAR(20) DEFAULT 'PENDING',      -- PENDING, AVAILABLE, PAID, REFUNDED

    -- Payout tracking (for future)
    payout_id BIGINT,                          -- Reference to payout batch
    paid_at TIMESTAMP,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_earnings_order_item FOREIGN KEY (order_item_id)
        REFERENCES payment.order_items(id) ON DELETE CASCADE,
    CONSTRAINT fk_earnings_order FOREIGN KEY (order_id)
        REFERENCES payment.orders(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX idx_earnings_instructor_id ON payment.instructor_earnings(instructor_id);
CREATE INDEX idx_earnings_order_id ON payment.instructor_earnings(order_id);
CREATE INDEX idx_earnings_course_id ON payment.instructor_earnings(course_id);
CREATE INDEX idx_earnings_status ON payment.instructor_earnings(status);
CREATE INDEX idx_earnings_created_at ON payment.instructor_earnings(created_at DESC);

-- =============================================
-- 9. ORDER NUMBER SEQUENCE
-- For generating ORD-{YYYYMMDD}-{SEQ}
-- =============================================
CREATE TABLE payment.order_sequences (
    id BIGSERIAL PRIMARY KEY,
    date_key VARCHAR(8) NOT NULL,              -- Format: YYYYMMDD
    current_sequence INT NOT NULL DEFAULT 0,

    CONSTRAINT uk_order_sequences_date UNIQUE (date_key)
);

-- =============================================
-- 10. TRANSACTION NUMBER SEQUENCE
-- For generating TXN-{YYYYMMDD}-{SEQ}
-- =============================================
CREATE TABLE payment.transaction_sequences (
    id BIGSERIAL PRIMARY KEY,
    date_key VARCHAR(8) NOT NULL,              -- Format: YYYYMMDD
    current_sequence INT NOT NULL DEFAULT 0,

    CONSTRAINT uk_transaction_sequences_date UNIQUE (date_key)
);

-- =============================================
-- FUNCTIONS: Generate Sequential Numbers
-- =============================================

-- Function to get next invoice number
CREATE OR REPLACE FUNCTION payment.get_next_invoice_number()
RETURNS VARCHAR(50) AS $$
DECLARE
    v_year_month VARCHAR(6);
    v_seq INT;
BEGIN
    v_year_month := TO_CHAR(CURRENT_DATE, 'YYYYMM');

    INSERT INTO payment.invoice_sequences (year_month, current_sequence)
    VALUES (v_year_month, 1)
    ON CONFLICT (year_month)
    DO UPDATE SET current_sequence = payment.invoice_sequences.current_sequence + 1
    RETURNING current_sequence INTO v_seq;

    RETURN 'INV-' || v_year_month || '-' || LPAD(v_seq::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;

-- Function to get next order number
CREATE OR REPLACE FUNCTION payment.get_next_order_number()
RETURNS VARCHAR(50) AS $$
DECLARE
    v_date_key VARCHAR(8);
    v_seq INT;
BEGIN
    v_date_key := TO_CHAR(CURRENT_DATE, 'YYYYMMDD');

    INSERT INTO payment.order_sequences (date_key, current_sequence)
    VALUES (v_date_key, 1)
    ON CONFLICT (date_key)
    DO UPDATE SET current_sequence = payment.order_sequences.current_sequence + 1
    RETURNING current_sequence INTO v_seq;

    RETURN 'ORD-' || v_date_key || '-' || LPAD(v_seq::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;

-- Function to get next transaction number
CREATE OR REPLACE FUNCTION payment.get_next_transaction_number()
RETURNS VARCHAR(50) AS $$
DECLARE
    v_date_key VARCHAR(8);
    v_seq INT;
BEGIN
    v_date_key := TO_CHAR(CURRENT_DATE, 'YYYYMMDD');

    INSERT INTO payment.transaction_sequences (date_key, current_sequence)
    VALUES (v_date_key, 1)
    ON CONFLICT (date_key)
    DO UPDATE SET current_sequence = payment.transaction_sequences.current_sequence + 1
    RETURNING current_sequence INTO v_seq;

    RETURN 'TXN-' || v_date_key || '-' || LPAD(v_seq::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- COMMENTS
-- =============================================
COMMENT ON TABLE payment.platform_config IS 'Stores configurable platform settings';
COMMENT ON TABLE payment.carts IS 'Shopping cart - one per user';
COMMENT ON TABLE payment.cart_items IS 'Items in shopping cart';
COMMENT ON TABLE payment.orders IS 'Finalized purchase orders';
COMMENT ON TABLE payment.order_items IS 'Individual courses in an order';
COMMENT ON TABLE payment.transactions IS 'Payment transaction records from gateways';
COMMENT ON TABLE payment.invoices IS 'Invoice records with PDF storage';
COMMENT ON TABLE payment.instructor_earnings IS 'Instructor earnings per sale';
COMMENT ON TABLE payment.invoice_sequences IS 'Sequence generator for invoice numbers (monthly reset)';
COMMENT ON TABLE payment.order_sequences IS 'Sequence generator for order numbers (daily)';
COMMENT ON TABLE payment.transaction_sequences IS 'Sequence generator for transaction numbers (daily)';