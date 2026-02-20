package com.edumind.lms.modules.course.api.dto;

import java.time.LocalDateTime;

/**
 * Lightweight enrollment snapshot for cross-module read use-cases.
 */
public record EnrollmentInfo(
        Long courseId,
        Long studentId,
        String status,
        Integer progressPercentage,
        LocalDateTime completedAt
) {
}

