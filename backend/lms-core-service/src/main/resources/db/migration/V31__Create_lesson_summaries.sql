-- Lesson summaries table for AI-generated lesson summaries and vocabulary
CREATE TABLE ai.lesson_summaries (
    id            BIGSERIAL    PRIMARY KEY,
    lesson_id     BIGINT       NOT NULL UNIQUE,
    job_id        BIGINT       NOT NULL REFERENCES ai.ai_job_logs(id),
    summary_text  TEXT         NOT NULL,
    key_points    JSONB        NOT NULL DEFAULT '[]',
    vocabulary    JSONB        NOT NULL DEFAULT '[]',
    created_at    TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_lesson_summaries_lesson_id ON ai.lesson_summaries (lesson_id);

