-- Increase status column length to accommodate AWAITING_MANUAL_PAYOUT (24 chars)
ALTER TABLE payment.payouts ALTER COLUMN status TYPE VARCHAR(30);
