package com.edumind.lms.modules.course.repository;

import com.edumind.lms.modules.course.entity.Lesson;
import com.edumind.lms.modules.course.enums.ContentType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

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
     */
    @Query("SELECT MAX(l.orderIndex) FROM Lesson l WHERE l.section.id = :sectionId")
    Integer findMaxOrderIndexBySectionId(Long sectionId);
}
