-- Add bank details columns to payouts table for manual payout processing
ALTER TABLE payment.payouts
    ADD COLUMN bank_name VARCHAR(100),
    ADD COLUMN account_holder_name VARCHAR(100),
    ADD COLUMN swift_code VARCHAR(20),
    ADD COLUMN bank_address VARCHAR(200);

COMMENT ON COLUMN payment.payouts.bank_name IS 'Bank name for manual payout processing';
COMMENT ON COLUMN payment.payouts.account_holder_name IS 'Name of the account holder for payout';
COMMENT ON COLUMN payment.payouts.swift_code IS 'SWIFT/BIC code for international transfers (optional)';
COMMENT ON COLUMN payment.payouts.bank_address IS 'Bank branch address or location (optional)';
