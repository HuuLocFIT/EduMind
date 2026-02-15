-- Instructor payout settings table
CREATE TABLE payment.instructor_payout_settings (
    id BIGSERIAL PRIMARY KEY,
    instructor_id BIGINT NOT NULL UNIQUE,
    preferred_method VARCHAR(20) NOT NULL DEFAULT 'BANK_TRANSFER',

    -- Bank transfer fields
    bank_name VARCHAR(100),
    account_holder_name VARCHAR(100),
    bank_account VARCHAR(255),
    swift_code VARCHAR(20),
    bank_address VARCHAR(200),

    -- PayPal fields
    paypal_email VARCHAR(255),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE payment.instructor_payout_settings IS 'Instructor payout preferences (bank / PayPal)';
COMMENT ON COLUMN payment.instructor_payout_settings.preferred_method IS 'Preferred payout method: BANK_TRANSFER or PAYPAL';
