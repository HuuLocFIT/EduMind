-- Add optimistic locking version column to refund_requests
-- Prevents concurrent admin approve/reject from corrupting state
ALTER TABLE payment.refund_requests
    ADD COLUMN version BIGINT NOT NULL DEFAULT 0;
