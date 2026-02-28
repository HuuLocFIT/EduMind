CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS ai.lesson_embeddings (
    id          BIGSERIAL PRIMARY KEY,
    lesson_id   BIGINT      NOT NULL,
    course_id   BIGINT      NOT NULL,
    chunk_index INTEGER     NOT NULL,
    chunk_text  TEXT        NOT NULL,
    embedding   VECTOR(768) NOT NULL,
    created_at  TIMESTAMP   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lesson_embeddings_course_id ON ai.lesson_embeddings (course_id);
CREATE INDEX IF NOT EXISTS idx_lesson_embeddings_lesson_id ON ai.lesson_embeddings (lesson_id);
CREATE INDEX IF NOT EXISTS idx_lesson_embeddings_embedding
    ON ai.lesson_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
-- NOTE: ivfflat builds centroids from existing data. After a large backfill of lesson embeddings,
-- consider rebuilding this index in production for optimal recall:
-- REINDEX INDEX idx_lesson_embeddings_embedding;
-- Alternatively, on pgvector >= 0.5.0 you can use HNSW instead, which does not require pre-existing data:
-- CREATE INDEX CONCURRENTLY ... USING hnsw (embedding vector_cosine_ops);

CREATE TABLE IF NOT EXISTS ai.ai_rate_limits (
    id            BIGSERIAL PRIMARY KEY,
    user_id       BIGINT    NOT NULL,
    limit_date    DATE      NOT NULL DEFAULT CURRENT_DATE,
    message_count INT       NOT NULL DEFAULT 0,
    created_at    TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, limit_date)
);

