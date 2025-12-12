package com.edumind.lms.modules.course.repository;

import com.edumind.lms.modules.course.entity.Enrollment;
import com.edumind.lms.modules.course.enums.EnrollmentStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface EnrollmentRepository extends JpaRepository<Enrollment, Long> {
    /**
     * Find enrollment by ID (with course fetched)
     */
    @EntityGraph("Enrollment.withCourse")
    @Override
    Optional<Enrollment> findById(Long id);

    /**
     * Find enrollment by course and student (with course fetched)
     */
    @EntityGraph("Enrollment.withCourse")
    Optional<Enrollment> findByCourseIdAndStudentId(Long courseId, Long studentId);

    /**
     * Check if student is enrolled
     */
    boolean existsByCourseIdAndStudentId(Long courseId, Long studentId);

    /**
     * Find all enrollments for student (with course fetched)
     */
    @EntityGraph("Enrollment.withCourse")
    Page<Enrollment> findByStudentId(Long studentId, Pageable pageable);

    /**
     * Find active enrollments for student (with course fetched)
     */
    @EntityGraph("Enrollment.withCourse")
    Page<Enrollment> findByStudentIdAndStatus(Long studentId, EnrollmentStatus status, Pageable pageable);

    /**
     * Find enrollments for course (with course fetched)
     */
    @EntityGraph("Enrollment.withCourse")
    Page<Enrollment> findByCourseId(Long courseId, Pageable pageable);

    /**
     * Find completed enrollments for student (with course fetched)
     */
    @EntityGraph("Enrollment.withCourse")
    @Query("SELECT e FROM Enrollment e WHERE e.studentId = :studentId AND e.status = 'COMPLETED'")
    List<Enrollment> findCompletedEnrollmentsByStudent(Long studentId);

    /**
     * Find enrollments with progress above threshold (with course fetched)
     */
    @EntityGraph("Enrollment.withCourse")
    @Query("SELECT e FROM Enrollment e WHERE e.studentId = :studentId " +
            "AND e.progressPercentage >= :minProgress ORDER BY e.lastAccessedAt DESC")
    List<Enrollment> findInProgressCourses(Long studentId, Integer minProgress);

    /**
     * Count enrollments by course
     */
    long countByCourseId(Long courseId);

    /**
     * Count active enrollments by course
     */
    long countByCourseIdAndStatus(Long courseId, EnrollmentStatus status);

    /**
     * Find expiring enrollments
     */
    @Query("SELECT e FROM Enrollment e WHERE e.status = 'ACTIVE' " +
            "AND e.expiresAt IS NOT NULL AND e.expiresAt BETWEEN :now AND :threshold")
    List<Enrollment> findExpiringEnrollments(LocalDateTime now, LocalDateTime threshold);

    /**
     * Get student's course statistics using interface projection for type safety.
     * Maps results by field names instead of array indices.
     */
    @Query("SELECT COUNT(e) as total, " +
            "COALESCE(SUM(CASE WHEN e.status = 'ACTIVE' THEN 1 ELSE 0 END), 0) as active, " +
            "COALESCE(SUM(CASE WHEN e.status = 'COMPLETED' THEN 1 ELSE 0 END), 0) as completed, " +
            "COALESCE(SUM(CASE WHEN e.progressPercentage > 0 THEN 1 ELSE 0 END), 0) as started " +
            "FROM Enrollment e WHERE e.studentId = :studentId")
    EnrollmentStatisticsProjection getStudentStatistics(Long studentId);

    /**
     * Find recently accessed courses (with course fetched)
     */
    @EntityGraph("Enrollment.withCourse")
    @Query("SELECT e FROM Enrollment e WHERE e.studentId = :studentId " +
            "AND e.status = 'ACTIVE' ORDER BY e.lastAccessedAt DESC")
    List<Enrollment> findRecentlyAccessedCourses(Long studentId, Pageable pageable);
}
