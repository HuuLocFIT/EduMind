-- =============================================
-- V15: Add idempotency key and refund tracking to orders
-- Idempotency key to prevent duplicate orders
-- Proper refund tracking fields
-- =============================================

-- Add idempotency key column with unique constraint
ALTER TABLE payment.orders
    ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(64);

-- Create unique index for idempotency key (allows nulls)
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_idempotency_key
    ON payment.orders(idempotency_key)
    WHERE idempotency_key IS NOT NULL;

-- Add refund tracking columns
ALTER TABLE payment.orders
    ADD COLUMN IF NOT EXISTS refund_reason VARCHAR(500),
    ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMP;

-- Add index for refunded orders queries
CREATE INDEX IF NOT EXISTS idx_orders_refunded_at
    ON payment.orders(refunded_at)
    WHERE refunded_at IS NOT NULL;

-- Comments
COMMENT ON COLUMN payment.orders.idempotency_key IS 'Client-provided key to prevent duplicate order creation on retry';
COMMENT ON COLUMN payment.orders.refund_reason IS 'Reason for refund request (separate from failure_reason)';
COMMENT ON COLUMN payment.orders.refunded_at IS 'Timestamp when order was refunded';
