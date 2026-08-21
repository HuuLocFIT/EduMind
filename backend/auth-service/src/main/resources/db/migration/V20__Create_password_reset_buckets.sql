CREATE TABLE password_reset_buckets (
    email_hash  VARCHAR(64) NOT NULL,
    window_id   BIGINT      NOT NULL,
    attempts    INTEGER     NOT NULL,
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (email_hash, window_id)
);
CREATE INDEX idx_prb_window ON password_reset_buckets (window_id);
