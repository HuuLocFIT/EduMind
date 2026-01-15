-- =============================================
-- V11: Add version & expires_at columns to payment.orders
-- Keeps DB schema in sync with Order entity changes
-- =============================================

ALTER TABLE payment.orders
ADD COLUMN IF NOT EXISTS version BIGINT,
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP;


