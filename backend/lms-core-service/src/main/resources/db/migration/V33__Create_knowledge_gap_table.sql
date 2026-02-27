CREATE TABLE ai.knowledge_gap_questions (
    id         BIGSERIAL PRIMARY KEY,
    course_id  BIGINT    NOT NULL,
    question   TEXT      NOT NULL,
    asked_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_gap_course ON ai.knowledge_gap_questions(course_id);

