package com.edumind.lms.modules.course.api.impl;

import com.edumind.lms.modules.course.api.CourseQueryService;
import com.edumind.lms.modules.course.api.dto.CourseInfo;
import com.edumind.lms.modules.course.entity.Course;
import com.edumind.lms.modules.course.repository.CourseRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collection;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CourseQueryServiceImpl implements CourseQueryService {

    private final CourseRepository courseRepository;

    @Override
    public Optional<CourseInfo> getCourseInfo(Long courseId) {
        return courseRepository.findById(courseId).map(this::toInfo);
    }

    @Override
    public Map<Long, CourseInfo> getCourseInfoBatch(Collection<Long> courseIds) {
        if (courseIds == null || courseIds.isEmpty()) {
            return Map.of();
        }

        return courseRepository.findAllById(courseIds).stream()
                .map(this::toInfo)
                .collect(Collectors.toMap(CourseInfo::id, Function.identity(), (a, b) -> a));
    }

    private CourseInfo toInfo(Course course) {
        return new CourseInfo(
                course.getId(),
                course.getTitle(),
                course.getSlug(),
                course.getThumbnailUrl(),
                course.getPrice(),
                course.getDiscountPrice(),
                course.getEffectivePrice(),
                course.getOriginalPrice(),
                course.isPublished(),
                course.getInstructorId(),
                course.getInstructorName(),
                course.getCurrency() != null ? course.getCurrency() : "USD"
        );
    }
}

