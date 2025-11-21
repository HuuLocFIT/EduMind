INSERT INTO roles (name, description) VALUES
    ('ROLE_GUEST', 'Guest user with limited access'),
    ('ROLE_STUDENT', 'Student user with access to courses and learning materials'),
    ('ROLE_TEACHER', 'Teacher user with access to create and manage courses'),
    ('ROLE_ADMIN', 'Administrator with full system access')
ON CONFLICT (name) DO NOTHING;