-- =============================================
-- Add updated_at column to payout_items table
-- =============================================

ALTER TABLE payment.payout_items
ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Update existing rows to have updated_at = created_at
UPDATE payment.payout_items
SET updated_at = created_at;

-- Make updated_at NOT NULL after setting defaults
ALTER TABLE payment.payout_items
ALTER COLUMN updated_at SET NOT NULL;
