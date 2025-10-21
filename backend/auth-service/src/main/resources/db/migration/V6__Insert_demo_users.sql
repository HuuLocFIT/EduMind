-- Admin User
INSERT INTO users (username, email, password, first_name, last_name, is_active, is_email_verified)
VALUES ('admin', 'admin@edumind.com', '$2a$10$dXJ3SW6G7P50lGmMkkmwe.20cQQubK3.HZWzG3YB1tlRy.fqvM/BG', 'Admin', 'User', TRUE, TRUE)
ON CONFLICT (username) DO NOTHING;

-- Teacher User
INSERT INTO users (username, email, password, first_name, last_name, is_active, is_email_verified)
VALUES ('teacher', 'teacher@edumind.com', '$2a$10$dXJ3SW6G7P50lGmMkkmwe.20cQQubK3.HZWzG3YB1tlRy.fqvM/BG', 'John', 'Doe', TRUE, TRUE)
ON CONFLICT (username) DO NOTHING;

-- Student User
INSERT INTO users (username, email, password, first_name, last_name, is_active, is_email_verified)
VALUES ('student', 'student@edumind.com', '$2a$10$dXJ3SW6G7P50lGmMkkmwe.20cQQubK3.HZWzG3YB1tlRy.fqvM/BG', 'Jane', 'Smith', TRUE, TRUE)
ON CONFLICT (username) DO NOTHING;

-- Guest User
INSERT INTO users (username, email, password, first_name, last_name, is_active, is_email_verified)
VALUES ('guest', 'guest@edumind.com', '$2a$10$dXJ3SW6G7P50lGmMkkmwe.20cQQubK3.HZWzG3YB1tlRy.fqvM/BG', 'Guest', 'User', TRUE, FALSE)
ON CONFLICT (username) DO NOTHING;

-- Assign roles to users
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u, roles r
WHERE u.username = 'admin' AND r.name = 'ROLE_ADMIN'
ON CONFLICT DO NOTHING;

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u, roles r
WHERE u.username = 'teacher' AND r.name = 'ROLE_TEACHER'
ON CONFLICT DO NOTHING;

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u, roles r
WHERE u.username = 'student' AND r.name = 'ROLE_STUDENT'
ON CONFLICT DO NOTHING;

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u, roles r
WHERE u.username = 'guest' AND r.name = 'ROLE_GUEST'
ON CONFLICT DO NOTHING;