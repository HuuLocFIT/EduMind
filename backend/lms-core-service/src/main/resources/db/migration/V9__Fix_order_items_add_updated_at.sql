-- =============================================
-- FIX: Add missing updated_at column to order_items
-- =============================================

ALTER TABLE payment.order_items
ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;