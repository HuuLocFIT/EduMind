-- Add video upload tracking fields to lessons table
ALTER TABLE course.lessons ADD COLUMN video_upload_status VARCHAR(20) NOT NULL DEFAULT 'NONE';
ALTER TABLE course.lessons ADD COLUMN video_public_id VARCHAR(512);
