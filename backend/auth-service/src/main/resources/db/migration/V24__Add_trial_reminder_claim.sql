ALTER TABLE users ADD COLUMN trial_reminder_sent_at TIMESTAMP NULL;
COMMENT ON COLUMN users.trial_reminder_sent_at IS
  'Dedup marker set exactly once per trial when the expiry reminder is claimed';
