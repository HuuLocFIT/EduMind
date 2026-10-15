package com.edumind.lms.modules.course.service;

import com.edumind.lms.config.CacheConfig;
import com.edumind.lms.modules.course.dto.response.CourseDetailResponse;
import com.edumind.lms.modules.course.exception.CourseNotFoundException;
import com.edumind.lms.modules.course.repository.CourseRepository;
import com.edumind.lms.modules.course.util.CategoryMapper;
import com.edumind.lms.modules.course.util.CourseMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Read-through cache for the public course detail page (course + category + sections + lessons).
 *
 * <p>Entries are keyed by course id only, so every write path has exactly one key to evict
 * (see {@link CourseDetailCacheEvictor}). Only PUBLISHED courses are cached: drafts change
 * often and are seen by few people, so the instructor always reads fresh data.
 *
 * <p>The cached DTO is the same for every viewer. Visibility checks stay in the controller
 * and run on every request, hit or miss.
 */
@Service
@RequiredArgsConstructor
public class CourseDetailCacheService {

    private final CourseService courseService;
    private final CourseRepository courseRepository;
    private final CourseMapper courseMapper;
    private final CategoryMapper categoryMapper;

    @Cacheable(cacheNames = CacheConfig.COURSE_DETAIL, key = "#courseId",
            unless = "#result.status != T(com.edumind.lms.modules.course.enums.CourseStatus).PUBLISHED")
    @Transactional(readOnly = true)
    public CourseDetailResponse getDetail(Long courseId) {
        return courseMapper.toDetailResponse(courseService.getCourseById(courseId), categoryMapper);
    }

    @Transactional(readOnly = true)
    public Long resolveIdBySlug(String slug) {
        return courseRepository.findIdBySlug(slug)
                .orElseThrow(() -> new CourseNotFoundException(slug));
    }
}
