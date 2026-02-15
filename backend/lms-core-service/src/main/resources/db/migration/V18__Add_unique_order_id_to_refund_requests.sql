-- Add unique constraint on order_id in refund_requests to prevent duplicate refunds
-- Prevents race condition where two concurrent requests both pass existsByOrderId check
ALTER TABLE payment.refund_requests
    ADD CONSTRAINT uk_refund_requests_order_id UNIQUE (order_id);
