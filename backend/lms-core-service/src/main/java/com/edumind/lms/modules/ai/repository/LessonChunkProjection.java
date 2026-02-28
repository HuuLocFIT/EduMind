package com.edumind.lms.modules.ai.repository;

public interface LessonChunkProjection {

    Long getId();

    Long getLessonId();

    Long getCourseId();

    Integer getChunkIndex();

    String getChunkText();

    /**
     * Cosine distance between the query embedding and this chunk's embedding.
     * 0.0 = identical, 2.0 = opposite (pgvector <=> operator).
     */
    Double getDistance();
}

