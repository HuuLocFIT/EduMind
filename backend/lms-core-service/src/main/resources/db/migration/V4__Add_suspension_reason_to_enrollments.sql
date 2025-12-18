SET search_path TO course;

-- Add suspension_reason column to enrollments table for audit/logging purposes
ALTER TABLE enrollments
ADD COLUMN suspension_reason VARCHAR(500);

COMMENT ON COLUMN enrollments.suspension_reason IS 'Reason for suspension (required when teacher/admin suspends enrollment for audit purposes)';

