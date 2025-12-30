-- Add instructor reply columns
ALTER TABLE course.course_reviews
ADD COLUMN instructor_reply TEXT,
ADD COLUMN instructor_reply_at TIMESTAMP;

-- Add index for filtering reviews with/without replies
CREATE INDEX idx_course_reviews_has_reply
ON course.course_reviews (instructor_reply_at)
WHERE instructor_reply_at IS NOT NULL;

-- Add index for instructor queries (get reviews for instructor's courses)
CREATE INDEX idx_course_reviews_course_approved
ON course.course_reviews (course_id, is_approved);

COMMENT ON COLUMN course.course_reviews.instructor_reply IS 'Instructor reply to the review';
COMMENT ON COLUMN course.course_reviews.instructor_reply_at IS 'Timestamp when instructor replied';