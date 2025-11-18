CREATE TABLE email_verification_tokens (
    id BIGSERIAL PRIMARY KEY,
    token VARCHAR(255) UNIQUE NOT NULL,
    user_id BIGINT NOT NULL,
    expiry_date TIMESTAMP NOT NULL,
    verified_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_email_verification_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT chk_expiry_date
        CHECK (expiry_date > created_at)
);

-- Index for faster token lookup
CREATE INDEX idx_email_verification_token ON email_verification_tokens(token);

-- Index for faster user lookup
CREATE INDEX idx_email_verification_user_id ON email_verification_tokens(user_id);

-- Index for cleanup queries (find expired tokens)
CREATE INDEX idx_email_verification_expiry ON email_verification_tokens(expiry_date);

-- Add comments for documentation
COMMENT ON TABLE email_verification_tokens IS 'Stores verification tokens sent to users email addresses';
COMMENT ON COLUMN email_verification_tokens.token IS 'Unique verification token (UUID)';
COMMENT ON COLUMN email_verification_tokens.expiry_date IS 'Token expires after 24 hours';
COMMENT ON COLUMN email_verification_tokens.verified_at IS 'Timestamp when user clicked verification link';