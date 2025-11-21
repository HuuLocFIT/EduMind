CREATE TABLE password_reset_tokens (
    id BIGSERIAL PRIMARY KEY,
    token VARCHAR(255) UNIQUE NOT NULL,
    user_id BIGINT NOT NULL,
    expiry_date TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    used_at TIMESTAMP,
    ip_address VARCHAR(45), -- Support IPv6
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_password_reset_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT chk_password_reset_expiry
        CHECK (expiry_date > created_at),

    CONSTRAINT chk_password_reset_used_at
        CHECK (used_at IS NULL OR used_at >= created_at)
);

-- Index for faster token lookup
CREATE INDEX idx_password_reset_token ON password_reset_tokens(token);

-- Index for faster user lookup
CREATE INDEX idx_password_reset_user_id ON password_reset_tokens(user_id);

-- Index for cleanup queries
CREATE INDEX idx_password_reset_expiry ON password_reset_tokens(expiry_date);

-- Index for security auditing (find unused tokens)
CREATE INDEX idx_password_reset_used ON password_reset_tokens(used, expiry_date);

-- Add comments for documentation
COMMENT ON TABLE password_reset_tokens IS 'Stores password reset tokens for forgot password functionality';
COMMENT ON COLUMN password_reset_tokens.token IS 'Unique reset token (UUID), one-time use';
COMMENT ON COLUMN password_reset_tokens.expiry_date IS 'Token expires after 1 hour';
COMMENT ON COLUMN password_reset_tokens.used IS 'Prevents token reuse';
COMMENT ON COLUMN password_reset_tokens.ip_address IS 'IP address of reset request for security audit';
COMMENT ON COLUMN password_reset_tokens.user_agent IS 'Browser/device info for security audit';