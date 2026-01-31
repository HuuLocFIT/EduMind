-- =============================================
-- V12: Add retry_count & last_payment_attempt_at to payment.orders
-- Supports retry limits and audit of payment attempts
-- =============================================

ALTER TABLE payment.orders
ADD COLUMN IF NOT EXISTS retry_count INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_payment_attempt_at TIMESTAMP;


