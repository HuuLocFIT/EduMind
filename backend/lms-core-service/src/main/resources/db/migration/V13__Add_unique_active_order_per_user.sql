-- =============================================
-- V13: Ensure at most one active (PENDING/PROCESSING) order per user
-- Implements business invariant to reduce duplicate orders for same user/cart
-- =============================================

CREATE UNIQUE INDEX IF NOT EXISTS ux_orders_user_active_status
ON payment.orders (user_id)
WHERE status IN ('PENDING', 'PROCESSING');



