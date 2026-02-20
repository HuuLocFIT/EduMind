package com.edumind.lms.modules.course.api;

import com.edumind.lms.modules.course.api.dto.EnrollmentInfo;

import java.util.List;
import java.util.Optional;

/**
 * Anti-corruption layer (ACL) interface for querying enrollment data from other modules.
 */
public interface EnrollmentQueryService {
    boolean isStudentEnrolled(Long courseId, Long studentId);

    boolean isStudentEnrolledExcludingDropped(Long courseId, Long studentId);

    List<Long> findEnrolledCourseIds(Long studentId, List<Long> courseIds);

    Optional<EnrollmentInfo> getEnrollmentInfo(Long courseId, Long studentId);
}

