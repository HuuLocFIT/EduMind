-- Add bank account information columns to refund_requests table for manual refunds
ALTER TABLE payment.refund_requests
    ADD COLUMN bank_name VARCHAR(100),
    ADD COLUMN account_holder_name VARCHAR(100),
    ADD COLUMN account_number VARCHAR(50),
    ADD COLUMN swift_code VARCHAR(20),
    ADD COLUMN bank_address VARCHAR(200);

-- Add comment explaining the purpose of these columns
COMMENT ON COLUMN payment.refund_requests.bank_name IS 'Bank name for manual refund processing';
COMMENT ON COLUMN payment.refund_requests.account_holder_name IS 'Name of the account holder for refund';
COMMENT ON COLUMN payment.refund_requests.account_number IS 'Bank account number for refund transfer';
COMMENT ON COLUMN payment.refund_requests.swift_code IS 'SWIFT/BIC code for international transfers (optional)';
COMMENT ON COLUMN payment.refund_requests.bank_address IS 'Bank branch address or location (optional)';
