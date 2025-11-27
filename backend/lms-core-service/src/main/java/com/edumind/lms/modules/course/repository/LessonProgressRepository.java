package com.edumind.lms.modules.course.repository;

import com.edumind.lms.modules.course.entity.LessonProgress;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface LessonProgressRepository extends JpaRepository<LessonProgress, Long> {
    /**
     * Find progress for specific lesson and enrollment
     */
    Optional<LessonProgress> findByEnrollmentIdAndLessonId(Long enrollmentId, Long lessonId);

    /**
     * Find all progress for enrollment
     */
    List<LessonProgress> findByEnrollmentId(Long enrollmentId);

    /**
     * Find completed lessons for enrollment
     */
    List<LessonProgress> findByEnrollmentIdAndIsCompletedTrue(Long enrollmentId);

    /**
     * Count completed lessons for enrollment
     */
    long countByEnrollmentIdAndIsCompletedTrue(Long enrollmentId);

    /**
     * Find progress by student
     */
    List<LessonProgress> findByStudentId(Long studentId);

    /**
     * Check if lesson is completed
     */
    @Query("SELECT lp.isCompleted FROM LessonProgress lp WHERE lp.enrollment.id = :enrollmentId AND lp.lesson.id = :lessonId")
    Boolean isLessonCompleted(Long enrollmentId, Long lessonId);

    /**
     * Get completion percentage for enrollment
     */
    @Query("SELECT (COUNT(lp) * 100.0 / :totalLessons) FROM LessonProgress lp " +
            "WHERE lp.enrollment.id = :enrollmentId AND lp.isCompleted = true")
    Double getCompletionPercentage(Long enrollmentId, Integer totalLessons);
}
