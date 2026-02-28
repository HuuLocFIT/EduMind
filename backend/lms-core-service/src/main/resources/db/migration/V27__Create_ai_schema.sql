-- AI Module Schema
CREATE SCHEMA IF NOT EXISTS ai;
COMMENT ON SCHEMA ai IS 'AI module: job logs, generated quizzes, lesson summaries, embeddings';

-- AI job logs for async job tracking (polling)
CREATE TABLE ai.ai_job_logs (
    id              BIGSERIAL PRIMARY KEY,
    job_type        VARCHAR(50)  NOT NULL,
    status          VARCHAR(20)  NOT NULL DEFAULT 'PENDING',
    user_id         BIGINT,
    reference_id    BIGINT,                    -- lesson_id, course_id, etc.
    error_message   TEXT,
    started_at      TIMESTAMP,
    completed_at    TIMESTAMP,
    next_retry_at   TIMESTAMP,                 -- for DELAYED status (Phase 5)
    created_at      TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ai_job_logs_status ON ai.ai_job_logs (status);
CREATE INDEX idx_ai_job_logs_user_id ON ai.ai_job_logs (user_id);
CREATE INDEX idx_ai_job_logs_reference ON ai.ai_job_logs (job_type, reference_id);
CREATE INDEX idx_ai_job_logs_next_retry ON ai.ai_job_logs (next_retry_at) WHERE status = 'DELAYED';
