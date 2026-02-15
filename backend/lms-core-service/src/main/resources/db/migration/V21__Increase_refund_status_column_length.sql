-- =============================================
-- INCREASE REFUND STATUS COLUMN LENGTH
-- EduMind LMS - Support AWAITING_MANUAL_REFUND status (23 characters)
-- =============================================

-- Increase status column length from VARCHAR(20) to VARCHAR(30)
-- to accommodate the new AWAITING_MANUAL_REFUND enum value (23 characters)
ALTER TABLE payment.refund_requests 
    ALTER COLUMN status TYPE VARCHAR(30);

-- =============================================
-- COMMENTS
-- =============================================
COMMENT ON COLUMN payment.refund_requests.status IS 
    'Refund status: PENDING, APPROVED, AWAITING_MANUAL_REFUND, REJECTED, COMPLETED, FAILED';
