package com.edumind.lms.modules.course.api;

import com.edumind.lms.modules.course.api.dto.CourseInfo;

import java.util.Collection;
import java.util.Map;
import java.util.Optional;

/**
 * Anti-corruption layer (ACL) interface for querying course data from other modules.
 */
public interface CourseQueryService {
    Optional<CourseInfo> getCourseInfo(Long courseId);

    Map<Long, CourseInfo> getCourseInfoBatch(Collection<Long> courseIds);
}

