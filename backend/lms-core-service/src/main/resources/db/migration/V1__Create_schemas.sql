-- Course Module Schema
CREATE SCHEMA IF NOT EXISTS course;
COMMENT ON SCHEMA course IS 'Course module: courses, categories, sections, lessons, enrollments, progress, reviews, wishlist';

-- Assessment Module Schema (for future)
CREATE SCHEMA IF NOT EXISTS assessment;
COMMENT ON SCHEMA assessment IS 'Assessment module: quizzes, exams, questions';

-- Gamification Module Schema (for future)
CREATE SCHEMA IF NOT EXISTS gamification;
COMMENT ON SCHEMA gamification IS 'Gamification module: points, badges, leaderboard';

-- Payment Module Schema (for future)
CREATE SCHEMA IF NOT EXISTS payment;
COMMENT ON SCHEMA payment IS 'Payment module: transactions, invoices';

-- Notification Module Schema (for future)
CREATE SCHEMA IF NOT EXISTS notification;
COMMENT ON SCHEMA notification IS 'Notification module: emails, push notifications';

-- Public schema for shared utilities
COMMENT ON SCHEMA public IS 'Shared utilities: audit logs, system configs';