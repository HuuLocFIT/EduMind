package com.edumind.lms.modules.course.service;

import com.edumind.lms.modules.course.entity.CourseReview;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.Map;

public interface CourseReviewService {
    /**
     * Create a new review
     * @param courseId Course ID
     * @param studentId Student ID
     * @param rating Rating (1-5)
     * @param comment Review comment
     * @return Created review
     */
    CourseReview createReview(Long courseId, Long studentId, Integer rating, String comment);

    /**
     * Update existing review
     * @param reviewId Review ID
     * @param studentId Student ID (for authorization)
     * @param rating New rating
     * @param comment New comment
     * @return Updated review
     */
    CourseReview updateReview(Long reviewId, Long studentId, Integer rating, String comment);

    /**
     * Delete review
     * @param reviewId Review ID
     * @param studentId Student ID (for authorization)
     */
    void deleteReview(Long reviewId, Long studentId);

    /**
     * Get review by ID
     * @param reviewId Review ID
     * @return Review
     */
    CourseReview getReviewById(Long reviewId);

    /**
     * Get approved reviews for a course
     * @param courseId Course ID
     * @param pageable Pagination
     * @return Page of reviews
     */
    Page<CourseReview> getApprovedReviewsByCourse(Long courseId, Pageable pageable);

    /**
     * Get all reviews for a course (admin only)
     * @param courseId Course ID
     * @param pageable Pagination
     * @return Page of reviews
     */
    Page<CourseReview> getAllReviewsByCourse(Long courseId, Pageable pageable);

    /**
     * Get student's review for a course
     * @param courseId Course ID
     * @param studentId Student ID
     * @return Review or null if not found
     */
    CourseReview getStudentReviewForCourse(Long courseId, Long studentId);

    /**
     * Get all reviews by student
     * @param studentId Student ID
     * @param pageable Pagination
     * @return Page of reviews
     */
    Page<CourseReview> getReviewsByStudent(Long studentId, Pageable pageable);

    /**
     * Get pending reviews (for moderation)
     * @param pageable Pagination
     * @return Page of pending reviews
     */
    Page<CourseReview> getPendingReviews(Pageable pageable);

    /**
     * Approve review (admin/instructor only)
     * @param reviewId Review ID
     * @return Approved review
     */
    CourseReview approveReview(Long reviewId);

    /**
     * Reject review (admin/instructor only)
     * @param reviewId Review ID
     */
    void rejectReview(Long reviewId);

    /**
     * Get average rating for course
     * @param courseId Course ID
     * @return Average rating (0.0 if no reviews)
     */
    Double getAverageRating(Long courseId);

    /**
     * Get review count for course
     * @param courseId Course ID
     * @return Review count
     */
    long getReviewCount(Long courseId);

    /**
     * Get rating distribution for course
     * @param courseId Course ID
     * @return Map of rating -> count
     */
    Map<Integer, Long> getRatingDistribution(Long courseId);

    /**
     * Check if student has reviewed course
     * @param courseId Course ID
     * @param studentId Student ID
     * @return true if reviewed
     */
    boolean hasStudentReviewedCourse(Long courseId, Long studentId);

    /**
     * Check if auto-approve is enabled
     * @return true if auto-approve is enabled
     */
    boolean isAutoApproveEnabled();

    /**
     * Check if review should be auto-approved based on rating
     * @param rating Review rating
     * @return true if review meets auto-approve criteria
     */
    boolean shouldAutoApprove(Integer rating);
}