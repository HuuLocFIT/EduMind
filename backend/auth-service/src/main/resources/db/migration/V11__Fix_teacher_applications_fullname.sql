ALTER TABLE teacher_applications
ADD COLUMN first_name VARCHAR(50),
ADD COLUMN last_name VARCHAR(50);

UPDATE teacher_applications
SET
    first_name = SPLIT_PART(full_name, ' ', 1),
    last_name = SUBSTRING(full_name FROM POSITION(' ' IN full_name) + 1)
WHERE full_name IS NOT NULL AND full_name != '';

UPDATE teacher_applications
SET
    first_name = full_name,
    last_name = ''
WHERE full_name IS NOT NULL AND POSITION(' ' IN full_name) = 0;

-- Set NOT NULL constraints
ALTER TABLE teacher_applications
ALTER COLUMN first_name SET NOT NULL,
ALTER COLUMN last_name SET NOT NULL;

-- Drop old column
ALTER TABLE teacher_applications
DROP COLUMN full_name;

-- Comments
COMMENT ON COLUMN teacher_applications.first_name IS 'Applicant first name';
COMMENT ON COLUMN teacher_applications.last_name IS 'Applicant last name';