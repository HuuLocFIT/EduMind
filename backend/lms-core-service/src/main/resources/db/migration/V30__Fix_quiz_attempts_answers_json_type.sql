-- Fix answers_json column type from TEXT to JSONB to match JPA entity
ALTER TABLE ai.quiz_attempts 
ALTER COLUMN answers_json TYPE JSONB USING answers_json::jsonb;
