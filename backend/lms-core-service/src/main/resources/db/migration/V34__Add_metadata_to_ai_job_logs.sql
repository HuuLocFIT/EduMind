ALTER TABLE ai.ai_job_logs
    ADD COLUMN IF NOT EXISTS metadata TEXT;

COMMENT ON COLUMN ai.ai_job_logs.metadata IS 'Job-specific metadata (e.g. videoUrl for TRANSCRIPTION jobs)';

