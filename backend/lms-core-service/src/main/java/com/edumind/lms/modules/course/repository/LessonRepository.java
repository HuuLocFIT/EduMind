package com.edumind.lms.modules.course.repository;

import com.edumind.lms.modules.course.entity.Lesson;
import com.edumind.lms.modules.course.enums.ContentType;
import com.edumind.lms.modules.course.enums.VideoUploadStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface LessonRepository extends JpaRepository<Lesson, Long> {
    /**
     * Find lessons by section, ordered
     */
    List<Lesson> findBySectionIdOrderByOrderIndexAsc(Long sectionId);

    /**
     * Find lessons by course, ordered
     */
    @Query("SELECT l FROM Lesson l WHERE l.course.id = :courseId ORDER BY l.section.orderIndex, l.orderIndex")
    List<Lesson> findByCourseIdOrderBySectionAndLesson(Long courseId);

    /**
     * Find preview lessons (free access)
     */
    List<Lesson> findByCourseIdAndIsPreviewTrue(Long courseId);

    /**
     * Count lessons in course
     */
    long countByCourseId(Long courseId);

    /**
     * Count lessons in section
     */
    long countBySectionId(Long sectionId);

    /**
     * Find lessons by content type
     */
    List<Lesson> findByCourseIdAndContentType(Long courseId, ContentType contentType);

    /**
     * Get total video duration for course
     */
    @Query("SELECT SUM(l.videoDuration) FROM Lesson l WHERE l.course.id = :courseId AND l.contentType = 'VIDEO'")
    Integer getTotalVideoDurationByCourse(Long courseId);

    /**
     * Get max order index for section
     * Uses PESSIMISTIC_WRITE lock to prevent race condition when multiple lessons are created concurrently
     */
    @Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT MAX(l.orderIndex) FROM Lesson l WHERE l.section.id = :sectionId")
    Integer findMaxOrderIndexBySectionId(Long sectionId);

    /**
     * Count active uploads for an instructor (rate limiting)
     */
    @Query("SELECT COUNT(l) FROM Lesson l WHERE l.course.instructorId = :instructorId AND l.videoUploadStatus = :status")
    long countByInstructorIdAndVideoUploadStatus(@Param("instructorId") Long instructorId, @Param("status") VideoUploadStatus status);

    /**
     * Find stale uploads (stuck in UPLOADING for too long)
     */
    @Query("SELECT l FROM Lesson l WHERE l.videoUploadStatus = :status AND l.updatedAt < :cutoff")
    List<Lesson> findStaleUploads(@Param("cutoff") LocalDateTime cutoff, @Param("status") VideoUploadStatus status);
}
