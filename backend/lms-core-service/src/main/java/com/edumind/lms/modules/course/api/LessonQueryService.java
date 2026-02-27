package com.edumind.lms.modules.course.api;

import com.edumind.lms.modules.course.api.dto.LessonInfo;

import java.util.List;
import java.util.Optional;

/**
 * Anti-corruption layer (ACL) interface for querying lesson data from other modules.
 */
public interface LessonQueryService {
    Optional<LessonInfo> getLessonInfo(Long lessonId);

    /**
     * Return all lessons that have non-blank article content.
     * Used by the AI module to backfill embeddings.
     */
    List<LessonInfo> findAllWithArticleContent();
}
