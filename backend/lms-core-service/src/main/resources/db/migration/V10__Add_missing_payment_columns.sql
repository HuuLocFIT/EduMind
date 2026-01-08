-- =============================================
-- ADD MISSING COLUMNS TO PAYMENT TABLES
-- Fixes schema validation errors after entity updates
-- =============================================

-- Add missing columns to order_items table
ALTER TABLE payment.order_items
ADD COLUMN IF NOT EXISTS course_slug VARCHAR(255);

-- Add missing columns to orders table
ALTER TABLE payment.orders
ADD COLUMN IF NOT EXISTS customer_email VARCHAR(255),
ADD COLUMN IF NOT EXISTS customer_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS billing_address TEXT,
ADD COLUMN IF NOT EXISTS failure_reason VARCHAR(500);

-- Add missing columns to transactions table
ALTER TABLE payment.transactions
ADD COLUMN IF NOT EXISTS failure_code VARCHAR(50),
ADD COLUMN IF NOT EXISTS redirect_url VARCHAR(500);

-- Update status enum values in orders table (if needed)
-- Note: PROCESSING status is already supported by VARCHAR(20) type

-- Update status enum values in transactions table (if needed)
-- Note: CANCELLED and EXPIRED statuses are already supported by VARCHAR(20) type

