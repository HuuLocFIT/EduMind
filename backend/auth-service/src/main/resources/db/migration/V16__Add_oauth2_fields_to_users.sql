-- Add OAuth2 columns to users table
ALTER TABLE users
ADD COLUMN provider VARCHAR(20) DEFAULT 'LOCAL',
ADD COLUMN provider_user_id VARCHAR(255),
ADD COLUMN avatar_url VARCHAR(500);

-- Add index for provider lookups
CREATE INDEX idx_users_provider ON users(provider);

-- Add unique constraint for provider + provider_user_id combination
CREATE UNIQUE INDEX idx_users_provider_user_id
ON users(provider, provider_user_id)
WHERE provider != 'LOCAL';

-- Add comments for documentation
COMMENT ON COLUMN users.provider IS 'Authentication provider: LOCAL, GOOGLE, FACEBOOK';
COMMENT ON COLUMN users.provider_user_id IS 'User ID from OAuth2 provider (sub claim)';
COMMENT ON COLUMN users.avatar_url IS 'Profile picture URL from OAuth2 provider';

-- Add constraint for valid provider values
ALTER TABLE users
ADD CONSTRAINT chk_provider
CHECK (provider IN ('LOCAL', 'GOOGLE', 'FACEBOOK'));

-- Add constraint: if provider is not LOCAL, provider_user_id must exist
ALTER TABLE users
ADD CONSTRAINT chk_provider_user_id
CHECK (
    (provider = 'LOCAL') OR
    (provider != 'LOCAL' AND provider_user_id IS NOT NULL)
);

-- For OAuth2 users, password is optional
-- Update existing constraint to allow NULL password for OAuth2 users
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_password_check;
ALTER TABLE users
ADD CONSTRAINT chk_password_required
CHECK (
    (provider = 'LOCAL' AND password IS NOT NULL) OR
    (provider != 'LOCAL')
);