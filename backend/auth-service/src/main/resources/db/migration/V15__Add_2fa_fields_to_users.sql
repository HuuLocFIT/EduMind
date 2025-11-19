-- Add 2FA columns to users table
ALTER TABLE users
ADD COLUMN is_2fa_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN two_factor_secret VARCHAR(255),
ADD COLUMN backup_codes TEXT;

-- Add index for 2FA enabled users (for faster queries)
CREATE INDEX idx_users_2fa_enabled ON users(is_2fa_enabled) WHERE is_2fa_enabled = TRUE;

-- Add comments for documentation
COMMENT ON COLUMN users.is_2fa_enabled IS 'Whether 2FA is enabled for this user';
COMMENT ON COLUMN users.two_factor_secret IS 'TOTP secret key for 2FA (encrypted)';
COMMENT ON COLUMN users.backup_codes IS 'JSON array of backup codes for 2FA recovery';

-- Add constraint to ensure if 2FA is enabled, secret must exist
ALTER TABLE users
ADD CONSTRAINT chk_2fa_secret
CHECK (
    (is_2fa_enabled = FALSE) OR
    (is_2fa_enabled = TRUE AND two_factor_secret IS NOT NULL)
);