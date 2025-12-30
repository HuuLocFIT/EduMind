package com.edumind.lms.modules.course.repository;

import com.edumind.lms.modules.course.entity.CourseReview;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CourseReviewRepository extends JpaRepository<CourseReview, Long> {
    /**
     * Find review by course and student
     */
    Optional<CourseReview> findByCourseIdAndStudentId(Long courseId, Long studentId);

    /**
     * Find review by course and student with eager fetching
     */
    @EntityGraph(attributePaths = {"course", "enrollment"})
    @Query("SELECT r FROM CourseReview r WHERE r.course.id = :courseId AND r.studentId = :studentId")
    Optional<CourseReview> findByCourseIdAndStudentIdWithAssociations(Long courseId, Long studentId);

    /**
     * Find review by ID with eager fetching
     */
    @EntityGraph(attributePaths = {"course", "enrollment"})
    @Query("SELECT r FROM CourseReview r WHERE r.id = :reviewId")
    Optional<CourseReview> findByIdWithAssociations(Long reviewId);

    /**
     * Check if student already reviewed
     */
    boolean existsByCourseIdAndStudentId(Long courseId, Long studentId);

    /**
     * Find approved reviews for course
     */
    Page<CourseReview> findByCourseIdAndIsApprovedTrue(Long courseId, Pageable pageable);

    /**
     * Find approved reviews for course with eager fetching
     */
    @EntityGraph(attributePaths = {"course", "enrollment"})
    @Query("SELECT r FROM CourseReview r WHERE r.course.id = :courseId AND r.isApproved = true")
    Page<CourseReview> findByCourseIdAndIsApprovedTrueWithAssociations(Long courseId, Pageable pageable);

    /**
     * Find all reviews for course (for instructor/admin)
     */
    Page<CourseReview> findByCourseId(Long courseId, Pageable pageable);

    /**
     * Find all reviews for course with eager fetching
     */
    @EntityGraph(attributePaths = {"course", "enrollment"})
    @Query("SELECT r FROM CourseReview r WHERE r.course.id = :courseId")
    Page<CourseReview> findByCourseIdWithAssociations(Long courseId, Pageable pageable);

    /**
     * Find reviews by student
     */
    Page<CourseReview> findByStudentId(Long studentId, Pageable pageable);

    /**
     * Find reviews by student with eager fetching
     */
    @EntityGraph(attributePaths = {"course", "enrollment"})
    @Query("SELECT r FROM CourseReview r WHERE r.studentId = :studentId")
    Page<CourseReview> findByStudentIdWithAssociations(Long studentId, Pageable pageable);

    /**
     * Find pending reviews (for moderation)
     */
    Page<CourseReview> findByIsApprovedFalse(Pageable pageable);

    /**
     * Find pending reviews with eager fetching
     */
    @EntityGraph(attributePaths = {"course", "enrollment"})
    @Query("SELECT r FROM CourseReview r WHERE r.isApproved = false")
    Page<CourseReview> findByIsApprovedFalseWithAssociations(Pageable pageable);

    /**
     * Find flagged reviews
     */
    Page<CourseReview> findByIsFlaggedTrue(Pageable pageable);

    /**
     * Calculate average rating for course
     */
    @Query("SELECT AVG(r.rating) FROM CourseReview r WHERE r.course.id = :courseId AND r.isApproved = true")
    Double calculateAverageRating(Long courseId);

    /**
     * Count reviews for course
     */
    long countByCourseIdAndIsApprovedTrue(Long courseId);

    /**
     * Count reviews by rating
     */
    long countByCourseIdAndRatingAndIsApprovedTrue(Long courseId, Integer rating);

    /**
     * Get rating distribution
     */
    @Query("SELECT r.rating, COUNT(r) FROM CourseReview r " +
            "WHERE r.course.id = :courseId AND r.isApproved = true " +
            "GROUP BY r.rating ORDER BY r.rating DESC")
    Object[][] getRatingDistribution(Long courseId);

    /**
     * Find all reviews for courses owned by instructor
     * Supports filtering by courseId, rating, and hasReply status
     */
    @EntityGraph(attributePaths = {"course", "enrollment"})
    @Query("SELECT r FROM CourseReview r " +
            "WHERE r.course.instructorId = :instructorId " +
            "AND r.isApproved = true " +
            "AND (:courseId IS NULL OR r.course.id = :courseId) " +
            "AND (:rating IS NULL OR r.rating = :rating) " +
            "AND (:hasReply IS NULL OR " +
            "     (:hasReply = true AND r.instructorReply IS NOT NULL) OR " +
            "     (:hasReply = false AND r.instructorReply IS NULL))")
    Page<CourseReview> findInstructorReviews(
            @Param("instructorId") Long instructorId,
            @Param("courseId") Long courseId,
            @Param("rating") Integer rating,
            @Param("hasReply") Boolean hasReply,
            Pageable pageable
    );

    /**
     * Count total reviews for instructor's courses
     */
    @Query("SELECT COUNT(r) FROM CourseReview r " +
            "WHERE r.course.instructorId = :instructorId AND r.isApproved = true")
    long countInstructorReviews(@Param("instructorId") Long instructorId);

    /**
     * Count reviews with reply for instructor's courses
     */
    @Query("SELECT COUNT(r) FROM CourseReview r " +
            "WHERE r.course.instructorId = :instructorId " +
            "AND r.isApproved = true " +
            "AND r.instructorReply IS NOT NULL")
    long countInstructorRepliedReviews(@Param("instructorId") Long instructorId);

    /**
     * Calculate average rating across all instructor's courses
     */
    @Query("SELECT AVG(r.rating) FROM CourseReview r " +
            "WHERE r.course.instructorId = :instructorId AND r.isApproved = true")
    Double calculateInstructorAverageRating(@Param("instructorId") Long instructorId);

    /**
     * Get rating distribution for all instructor's courses
     */
    @Query("SELECT r.rating, COUNT(r) FROM CourseReview r " +
            "WHERE r.course.instructorId = :instructorId AND r.isApproved = true " +
            "GROUP BY r.rating ORDER BY r.rating DESC")
    List<Object[]> getInstructorRatingDistribution(@Param("instructorId") Long instructorId);

    /**
     * Find courses that have reviews for instructor (for filter dropdown)
     */
    @Query("SELECT DISTINCT r.course.id, r.course.title FROM CourseReview r " +
            "WHERE r.course.instructorId = :instructorId AND r.isApproved = true " +
            "ORDER BY r.course.title")
    List<Object[]> findInstructorCoursesWithReviews(@Param("instructorId") Long instructorId);
}