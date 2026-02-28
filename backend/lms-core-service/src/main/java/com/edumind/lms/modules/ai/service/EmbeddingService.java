package com.edumind.lms.modules.ai.service;

import com.edumind.lms.modules.course.entity.Lesson;

public interface EmbeddingService {

    /**
     * Request embedding generation for a lesson's article content.
     * Called from domain events after lesson content is updated.
     */
    void requestEmbedding(Lesson lesson);

    /**
     * Trigger embedding generation for all lessons that have article content.
     * Used to backfill embeddings for lessons created before the embedding feature existed.
     *
     * @return number of lessons queued for embedding
     */
    int reindexAll();
}

