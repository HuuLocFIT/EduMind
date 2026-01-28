-- Add gateway_order_id column to transactions table
-- This preserves the original PayPal Order ID for lookups after capture
-- (gatewayTransactionId gets updated to Capture ID after capture)

ALTER TABLE payment.transactions
ADD COLUMN IF NOT EXISTS gateway_order_id VARCHAR(100);

-- Create index for efficient lookups by gateway_order_id
CREATE INDEX IF NOT EXISTS idx_transactions_gateway_order_id
ON payment.transactions(gateway_order_id);

-- Add comment for documentation
COMMENT ON COLUMN payment.transactions.gateway_order_id IS 'Original gateway order ID (e.g., PayPal Order ID) preserved for lookups after capture updates gatewayTransactionId to Capture ID';
