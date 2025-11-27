package com.edumind.lms.modules.course.repository;

import com.edumind.lms.modules.course.entity.Enrollment;
import com.edumind.lms.modules.course.enums.EnrollmentStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface EnrollmentRepository extends JpaRepository<Enrollment, Long> {
    /**
     * Find enrollment by course and student
     */
    Optional<Enrollment> findByCourseIdAndStudentId(Long courseId, Long studentId);

    /**
     * Check if student is enrolled
     */
    boolean existsByCourseIdAndStudentId(Long courseId, Long studentId);

    /**
     * Find all enrollments for student
     */
    Page<Enrollment> findByStudentId(Long studentId, Pageable pageable);

    /**
     * Find active enrollments for student
     */
    Page<Enrollment> findByStudentIdAndStatus(Long studentId, EnrollmentStatus status, Pageable pageable);

    /**
     * Find enrollments for course
     */
    Page<Enrollment> findByCourseId(Long courseId, Pageable pageable);

    /**
     * Find completed enrollments for student
     */
    @Query("SELECT e FROM Enrollment e WHERE e.studentId = :studentId AND e.status = 'COMPLETED'")
    List<Enrollment> findCompletedEnrollmentsByStudent(Long studentId);

    /**
     * Find enrollments with progress above threshold
     */
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
     * Get student's course statistics
     */
    @Query("SELECT COUNT(e), " +
            "SUM(CASE WHEN e.status = 'COMPLETED' THEN 1 ELSE 0 END), " +
            "AVG(e.progressPercentage) " +
            "FROM Enrollment e WHERE e.studentId = :studentId")
    Object[] getStudentStatistics(Long studentId);

    /**
     * Find recently accessed courses
     */
    @Query("SELECT e FROM Enrollment e WHERE e.studentId = :studentId " +
            "AND e.status = 'ACTIVE' ORDER BY e.lastAccessedAt DESC")
    List<Enrollment> findRecentlyAccessedCourses(Long studentId, Pageable pageable);
}
