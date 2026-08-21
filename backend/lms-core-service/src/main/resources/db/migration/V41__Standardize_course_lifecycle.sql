UPDATE course.courses SET status = 'DRAFT' WHERE status = 'PENDING_REVIEW';

ALTER TABLE course.courses DROP CONSTRAINT IF EXISTS courses_status_check;
ALTER TABLE course.courses
    ADD CONSTRAINT courses_status_check CHECK (status IN ('DRAFT', 'PUBLISHED', 'ARCHIVED'));

ALTER TABLE course.courses
    ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS archived_by BIGINT,
    ADD COLUMN IF NOT EXISTS archive_reason TEXT;
