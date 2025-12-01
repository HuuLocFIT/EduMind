package com.edumind.lms.modules.course.repository;

import com.edumind.lms.modules.course.entity.CourseReview;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

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
}