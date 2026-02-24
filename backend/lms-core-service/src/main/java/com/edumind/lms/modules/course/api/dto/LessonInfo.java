package com.edumind.lms.modules.course.api.dto;

/**
 * Lightweight lesson snapshot for cross-module read use-cases.
 */
public record LessonInfo(Long id, String title, String articleContent, Long courseId, Long instructorId) {
}
