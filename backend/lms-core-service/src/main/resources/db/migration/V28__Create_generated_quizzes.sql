-- Generated quizzes table for AI quiz generation feature
CREATE TABLE ai.generated_quizzes (
    id              BIGSERIAL PRIMARY KEY,
    lesson_id       BIGINT       NOT NULL,
    job_id          BIGINT       NOT NULL REFERENCES ai.ai_job_logs(id),
    questions_json  JSONB        NOT NULL,
    created_at      TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_generated_quizzes_lesson_id ON ai.generated_quizzes (lesson_id);
CREATE INDEX idx_generated_quizzes_job_id    ON ai.generated_quizzes (job_id);
