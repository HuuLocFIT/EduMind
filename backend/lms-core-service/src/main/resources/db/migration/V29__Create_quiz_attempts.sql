-- Quiz attempts table for student quiz submissions
CREATE TABLE ai.quiz_attempts (
    id           BIGSERIAL PRIMARY KEY,
    student_id   BIGINT       NOT NULL,
    lesson_id    BIGINT       NOT NULL,
    quiz_id      BIGINT       NOT NULL REFERENCES ai.generated_quizzes(id),
    score        INT          NOT NULL,
    total        INT          NOT NULL,
    answers_json TEXT         NOT NULL,   -- JSON array of chosen answer indices
    completed_at TIMESTAMP    NOT NULL DEFAULT NOW(),
    created_at   TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_quiz_attempts_student_lesson ON ai.quiz_attempts(student_id, lesson_id);
CREATE INDEX idx_quiz_attempts_quiz_id ON ai.quiz_attempts(quiz_id);
