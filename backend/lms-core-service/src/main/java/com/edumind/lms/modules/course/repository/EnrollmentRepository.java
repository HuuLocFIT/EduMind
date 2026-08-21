package com.edumind.lms.modules.course.repository;

import com.edumind.lms.modules.course.entity.Enrollment;
import com.edumind.lms.modules.course.enums.EnrollmentStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import jakarta.persistence.LockModeType;
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
    @Query("SELECT e FROM Enrollment e WHERE e.studentId = :studentId AND e.status = 'COMPLETED' " +
            "ORDER BY e.completedAt DESC NULLS LAST, e.enrolledAt DESC")
    List<Enrollment> findCompletedEnrollmentsByStudent(Long studentId);

    /**
     * Find enrollments with progress above threshold (with course fetched)
     */
    @EntityGraph("Enrollment.withCourse")
    @Query("SELECT e FROM Enrollment e WHERE e.studentId = :studentId " +
            "AND e.progressPercentage >= :minProgress ORDER BY e.lastAccessedAt DESC")
    List<Enrollment> findInProgressCourses(Long studentId, Integer minProgress);

    /**
     * Find enrollment by certificate reference (with course fetched)
     */
    @EntityGraph("Enrollment.withCourse")
    Optional<Enrollment> findByCertificateReference(String certificateReference);

    /**
     * Find enrollment by ID with pessimistic write lock.
     * Used by certificate regeneration to prevent concurrent duplicate generation.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT e FROM Enrollment e JOIN FETCH e.course WHERE e.id = :id")
    Optional<Enrollment> findByIdForUpdate(@Param("id") Long id);

    /**
     * Count enrollments by course
     */
    long countByCourseId(Long courseId);

    /**
     * Count active enrollments by course
     */
    long countByCourseIdAndStatus(Long courseId, EnrollmentStatus status);

    long countByCourseIdAndStatusIn(Long courseId, List<EnrollmentStatus> statuses);

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
            "FROM Enrollment e WHERE e.studentId = :studentId AND e.status <> 'DROPPED'")
    EnrollmentStatisticsProjection getStudentStatistics(Long studentId);

    /**
     * Find recently accessed courses (with course fetched)
     */
    @EntityGraph("Enrollment.withCourse")
    @Query("SELECT e FROM Enrollment e WHERE e.studentId = :studentId " +
            "AND e.status = 'ACTIVE' ORDER BY COALESCE(e.lastAccessedAt, e.enrolledAt) DESC")
    List<Enrollment> findRecentlyAccessedCourses(Long studentId, Pageable pageable);

    /**
     * Find enrollments for student excluding a specific status (with course fetched)
     * Used to efficiently filter out DROPPED enrollments at database level
     */
    @EntityGraph("Enrollment.withCourse")
    Page<Enrollment> findByStudentIdAndStatusNot(Long studentId, EnrollmentStatus status, Pageable pageable);

    /**
     * Count enrollments for student excluding a specific status
     * Used for efficient pagination without loading all data into memory
     */
    long countByStudentIdAndStatusNot(Long studentId, EnrollmentStatus status);

    /**
     * Check if user is enrolled in course (alias for existsByCourseIdAndStudentId)
     * Optimized to use direct foreign key instead of join through course relationship
     */
    @Query("SELECT COUNT(e) > 0 FROM Enrollment e WHERE e.studentId = :userId AND e.course.id = :courseId")
    boolean existsByUserIdAndCourseId(@Param("userId") Long userId, @Param("courseId") Long courseId);

    /**
     * Check if student is enrolled excluding specific status (e.g. DROPPED)
     */
    boolean existsByCourseIdAndStudentIdAndStatusNot(Long courseId, Long studentId, EnrollmentStatus status);

    /**
     * Find enrolled course IDs for a user from a list of course IDs.
     * Optimized to use direct foreign key access instead of join through course relationship.
     * Uses course_id foreign key directly for better performance.
     * Excludes DROPPED enrollments.
     */
    @Query("SELECT e.course.id FROM Enrollment e WHERE e.studentId = :userId AND e.course.id IN :courseIds AND e.status != 'DROPPED'")
    List<Long> findEnrolledCourseIds(@Param("userId") Long userId, @Param("courseIds") List<Long> courseIds);

    /**
     * Increment totalLessons for all ACTIVE enrollments on a course.
     * Called when a new lesson is added to the course.
     */
    @Modifying
    @Query("UPDATE Enrollment e SET e.totalLessons = e.totalLessons + 1 WHERE e.course.id = :courseId AND e.status = 'ACTIVE'")
    void incrementTotalLessonsForCourse(@Param("courseId") Long courseId);

    /**
     * Decrement totalLessons for all ACTIVE enrollments on a course (floor at 0)
     * and recalculate progressPercentage. Called when a lesson is deleted from the course.
     */
    @Modifying
    @Query(value = """
            UPDATE course.enrollments
            SET total_lessons = GREATEST(total_lessons - 1, 0),
                progress_percentage = CASE
                    WHEN GREATEST(total_lessons - 1, 0) = 0 THEN 0
                    ELSE ROUND(completed_lessons * 100.0 / GREATEST(total_lessons - 1, 0), 2)
                END
            WHERE course_id = :courseId AND status = 'ACTIVE'
            """, nativeQuery = true)
    void decrementTotalLessonsForCourse(@Param("courseId") Long courseId);

    /**
     * Count enrollments by status
     */
    @Query("SELECT COUNT(e) FROM Enrollment e WHERE e.status = :status")
    long countByStatus(@Param("status") EnrollmentStatus status);

    /**
     * Get monthly enrollment counts for the last 6 months
     */
    @Query(value = """
            SELECT TO_CHAR(DATE_TRUNC('month', e.enrolled_at), 'Mon YYYY') as month,
                   COUNT(*) as count
            FROM course.enrollments e
            WHERE e.enrolled_at >= NOW() - INTERVAL '6 months'
            GROUP BY DATE_TRUNC('month', e.enrolled_at)
            ORDER BY DATE_TRUNC('month', e.enrolled_at)
            """, nativeQuery = true)
    List<Object[]> getMonthlyEnrollmentCounts();

    /**
     * Get monthly enrollment counts for instructor's courses (last 6 months)
     */
    @Query("""
            SELECT TO_CHAR(DATE_TRUNC('month', e.enrolledAt), 'Mon YYYY'), COUNT(e)
            FROM Enrollment e JOIN e.course c
            WHERE c.instructorId = :instructorId
              AND e.enrolledAt >= :startDate
            GROUP BY TO_CHAR(DATE_TRUNC('month', e.enrolledAt), 'Mon YYYY'), DATE_TRUNC('month', e.enrolledAt)
            ORDER BY DATE_TRUNC('month', e.enrolledAt)
            """)
    List<Object[]> getMonthlyEnrollmentCountsByInstructor(@Param("instructorId") Long instructorId, @Param("startDate") LocalDateTime startDate);

    /**
     * Get enrollment status breakdown for instructor's courses
     */
    @Query("""
            SELECT e.status, COUNT(e)
            FROM Enrollment e JOIN e.course c
            WHERE c.instructorId = :instructorId
            GROUP BY e.status
            """)
    List<Object[]> getEnrollmentStatusBreakdownByInstructor(@Param("instructorId") Long instructorId);

    /**
     * Find COMPLETED enrollments where certificate should be available but hasn't been generated yet.
     * Used by CertificateGenerationScheduler to retroactively generate certificates after
     * config changes (e.g., requirePaidCourse changed from true to false).
     */
    @EntityGraph("Enrollment.withCourse")
    @Query("SELECT e FROM Enrollment e JOIN e.course c WHERE e.status = 'COMPLETED' AND e.certificateUrl IS NULL AND c.hasCertificate = true ORDER BY e.completedAt ASC")
    Page<Enrollment> findStalledCertificateEnrollments(Pageable pageable);
}
