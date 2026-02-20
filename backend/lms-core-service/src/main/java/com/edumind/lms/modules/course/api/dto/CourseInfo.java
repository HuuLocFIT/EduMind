package com.edumind.lms.modules.course.api.dto;

import java.math.BigDecimal;

/**
 * Lightweight course snapshot for cross-module read use-cases.
 */
public record CourseInfo(
        Long id,
        String title,
        String slug,
        String thumbnailUrl,
        BigDecimal price,
        BigDecimal discountPrice,
        BigDecimal effectivePrice,
        BigDecimal originalPrice,
        boolean isPublished,
        Long instructorId,
        String instructorName,
        String currency
) {
}

