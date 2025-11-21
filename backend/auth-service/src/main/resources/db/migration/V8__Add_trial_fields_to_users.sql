ALTER TABLE users
ADD COLUMN trial_start_date TIMESTAMP,
ADD COLUMN trial_end_date TIMESTAMP,
ADD COLUMN is_trial BOOLEAN DEFAULT FALSE;

-- Comments
COMMENT ON COLUMN users.trial_start_date IS 'Start date of trial period (for TEACHER_TRIAL role)';
COMMENT ON COLUMN users.trial_end_date IS 'End date of trial period (30 days from start)';
COMMENT ON COLUMN users.is_trial IS 'Flag to indicate if user is in trial period';

-- Index for checking expired trials
CREATE INDEX idx_users_trial_end_date ON users(trial_end_date) WHERE trial_end_date IS NOT NULL;