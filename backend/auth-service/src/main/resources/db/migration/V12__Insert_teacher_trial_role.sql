INSERT INTO roles (name, description) VALUES
    ('ROLE_TEACHER_TRIAL', 'Teacher user with access to create and manage courses within 30 days trial period')
ON CONFLICT (name) DO NOTHING;