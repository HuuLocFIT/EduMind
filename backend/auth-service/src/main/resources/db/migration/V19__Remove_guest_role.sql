-- Remove unused ROLE_GUEST: it was never assigned by any real registration/login flow
-- (AuthService always assigns ROLE_STUDENT). Only the demo seed data in
-- V6__Insert_demo_users.sql ever attached it to a user.
DELETE FROM user_roles
WHERE role_id IN (SELECT id FROM roles WHERE name = 'ROLE_GUEST');

DELETE FROM users
WHERE username = 'guest';

DELETE FROM roles
WHERE name = 'ROLE_GUEST';
