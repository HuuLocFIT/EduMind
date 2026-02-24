package com.edumind.lms.modules.course.api;

import com.edumind.lms.modules.course.api.dto.LessonInfo;

import java.util.Optional;

/**
 * Anti-corruption layer (ACL) interface for querying lesson data from other modules.
 */
public interface LessonQueryService {
    Optional<LessonInfo> getLessonInfo(Long lessonId);
}
