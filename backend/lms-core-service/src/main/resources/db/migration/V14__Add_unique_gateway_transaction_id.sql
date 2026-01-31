-- =============================================
-- V14: Add uniqueness constraint for gateway_transaction_id on payment.transactions
-- Protects against duplicate processing from the same gateway transaction
-- =============================================

CREATE UNIQUE INDEX IF NOT EXISTS ux_transactions_gateway_tx_id
ON payment.transactions (gateway_transaction_id)
WHERE gateway_transaction_id IS NOT NULL;



