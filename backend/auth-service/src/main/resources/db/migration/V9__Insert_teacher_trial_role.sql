INSERT INTO roles (name, description)
VALUES
    ('TEACHER_TRIAL', 'Trial teacher with limited access for 30 days')
ON CONFLICT (name) DO NOTHING;

-- Comments
COMMENT ON TABLE roles IS 'Available roles: STUDENT (default), TEACHER (full access), TEACHER_TRIAL (30-day trial), ADMIN (system admin)';