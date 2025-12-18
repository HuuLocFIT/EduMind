-- Extend enrollment status check constraint to allow DROPPED status

ALTER TABLE course.enrollments
    DROP CONSTRAINT IF EXISTS enrollments_status_check;

ALTER TABLE course.enrollments
    ADD CONSTRAINT enrollments_status_check
    CHECK (status IN ('ACTIVE', 'COMPLETED', 'SUSPENDED', 'EXPIRED', 'DROPPED'));


