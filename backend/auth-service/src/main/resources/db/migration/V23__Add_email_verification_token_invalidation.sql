ALTER TABLE email_verification_tokens
    ADD COLUMN invalidated_at TIMESTAMP NULL;
