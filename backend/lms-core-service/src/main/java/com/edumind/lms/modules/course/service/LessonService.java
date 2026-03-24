package com.edumind.lms.modules.course.service;

import com.edumind.lms.modules.course.dto.request.ConfirmVideoUploadRequest;
import com.edumind.lms.modules.course.dto.response.LessonResponse;
import com.edumind.lms.modules.course.dto.response.VideoSignatureResponse;
import com.edumind.lms.modules.course.entity.Lesson;

import java.util.List;

public interface LessonService {
    /**
     * Create lesson (TEACHER)
     */
    Lesson createLesson(Long sectionId, Lesson lesson, Long instructorId);

    /**
     * Update lesson (TEACHER)
     */
    Lesson updateLesson(Long lessonId, Lesson lessonUpdate, Long instructorId);

    /**
     * Delete lesson (TEACHER)
     */
    void deleteLesson(Long lessonId, Long instructorId);

    /**
     * Get lesson by ID
     */
    Lesson getLessonById(Long lessonId);

    /**
     * Get section lessons (ordered)
     */
    List<Lesson> getSectionLessons(Long sectionId);

    /**
     * Get course lessons (ordered by section)
     */
    List<Lesson> getCourseLessons(Long courseId);

    /**
     * Get preview lessons (free access)
     */
    List<Lesson> getPreviewLessons(Long courseId);

    /**
     * Check if user can access lesson
     */
    boolean canAccessLesson(Long lessonId, Long userId);

    /**
     * Reorder lessons in section
     */
    void reorderLessons(Long sectionId, List<Long> lessonIds, Long instructorId);

    /**
     * Generate Cloudinary upload signature for video (TEACHER)
     */
    VideoSignatureResponse generateVideoUploadSignature(Long lessonId, Long instructorId);

    /**
     * Confirm video upload after Cloudinary upload completes (TEACHER)
     */
    LessonResponse confirmVideoUpload(Long lessonId, ConfirmVideoUploadRequest request, Long instructorId);

    /**
     * Delete video from lesson and Cloudinary (TEACHER)
     */
    void deleteVideo(Long lessonId, Long instructorId);

    /**
     * Reset stuck upload state so a new upload can start (TEACHER)
     */
    void resetVideoUploadState(Long lessonId, Long instructorId);
}
