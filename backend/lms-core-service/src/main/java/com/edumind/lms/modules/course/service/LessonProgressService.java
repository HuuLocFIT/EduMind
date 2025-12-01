package com.edumind.lms.modules.course.service;

import com.edumind.lms.modules.course.entity.LessonProgress;

import java.util.List;

public interface LessonProgressService {
    /**
     * Start lesson (create or get progress)
     */
    LessonProgress startLesson(Long enrollmentId, Long lessonId, Long studentId);

    /**
     * Update watch progress (for video lessons)
     */
    LessonProgress updateWatchProgress(Long enrollmentId, Long lessonId, Integer watchDuration, Integer lastPosition);

    /**
     * Mark lesson as completed
     */
    LessonProgress markLessonComplete(Long enrollmentId, Long lessonId);

    /**
     * Get lesson progress
     */
    LessonProgress getLessonProgress(Long enrollmentId, Long lessonId);

    /**
     * Get all progress for enrollment
     */
    List<LessonProgress> getEnrollmentProgress(Long enrollmentId);

    /**
     * Get completed lessons for enrollment
     */
    List<LessonProgress> getCompletedLessons(Long enrollmentId);

    /**
     * Check if lesson is completed
     */
    boolean isLessonCompleted(Long enrollmentId, Long lessonId);

    /**
     * Get completion percentage
     */
    Double getCompletionPercentage(Long enrollmentId, Integer totalLessons);
}
