-- Add deleted_at column to users table for soft delete functionality
ALTER TABLE users
ADD COLUMN deleted_at TIMESTAMP NULL;

-- Add index for faster queries filtering deleted users
CREATE INDEX idx_users_deleted_at ON users(deleted_at) WHERE deleted_at IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN users.deleted_at IS 'Timestamp when user account was soft deleted. NULL means account is active.';

