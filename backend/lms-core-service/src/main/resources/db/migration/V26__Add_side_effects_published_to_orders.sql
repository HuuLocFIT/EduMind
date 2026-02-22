-- Issue #5: Track whether async side effects were published after order completion
ALTER TABLE payment.orders ADD COLUMN IF NOT EXISTS side_effects_published BOOLEAN DEFAULT FALSE;
