SET search_path TO course;

-- Step 1: Update existing data - set NULL for courses without reviews
UPDATE courses
SET average_rating = NULL
WHERE total_reviews = 0;

-- Step 2: Alter column to allow NULL and remove default 0.00
ALTER TABLE courses
DROP CONSTRAINT IF EXISTS check_rating_consistency;

ALTER TABLE courses
ALTER COLUMN average_rating DROP DEFAULT;

ALTER TABLE courses 
ALTER COLUMN average_rating SET DEFAULT NULL;

-- Step 3: Add constraint to ensure consistency between total_reviews and average_rating
ALTER TABLE courses
ADD CONSTRAINT check_rating_consistency
CHECK (
    (total_reviews = 0 AND average_rating IS NULL) OR
    (total_reviews > 0 AND average_rating IS NOT NULL AND average_rating BETWEEN 0.00 AND 5.00)
);

COMMENT ON CONSTRAINT check_rating_consistency ON courses IS
'Ensures average_rating is NULL when no reviews exist, and has valid value (0-5) when reviews exist';