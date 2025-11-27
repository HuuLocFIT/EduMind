package com.edumind.lms.modules.course.service;

import com.edumind.lms.modules.course.entity.Course;
import com.edumind.lms.modules.course.entity.CourseReview;
import com.edumind.lms.modules.course.entity.Enrollment;
import com.edumind.lms.modules.course.event.ReviewApprovedEvent;
import com.edumind.lms.modules.course.event.ReviewCreatedEvent;
import com.edumind.lms.modules.course.exception.DuplicateReviewException;
import com.edumind.lms.modules.course.exception.InvalidRatingException;
import com.edumind.lms.modules.course.exception.NotEnrolledException;
import com.edumind.lms.modules.course.repository.CourseRepository;
import com.edumind.lms.modules.course.repository.CourseReviewRepository;
import com.edumind.lms.modules.course.repository.EnrollmentRepository;
import com.edumind.lms.shared.exception.ResourceNotFoundException;
import com.edumind.lms.shared.exception.UnauthorizedException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class CourseReviewServiceImpl implements CourseReviewService {
    private final CourseReviewRepository reviewRepository;
    private final CourseRepository courseRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final ApplicationEventPublisher eventPublisher;

    @Override
    @Transactional
    public CourseReview createReview(Long courseId, Long studentId, Integer rating, String reviewText) {
        log.info("Creating review for course {} by student {}", courseId, studentId);

        // Validate rating
        if (rating < 1 || rating > 5) {
            throw new InvalidRatingException("Rating must be between 1 and 5");
        }

        // Check if course exists
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new ResourceNotFoundException("Course not found with ID: " + courseId));

        // Check if student is enrolled
        Enrollment enrollment = enrollmentRepository.findByCourseIdAndStudentId(courseId, studentId)
                .orElseThrow(() -> new NotEnrolledException("Student must be enrolled to review this course"));

        // Check if student has already reviewed - USING CORRECT METHOD
        if (reviewRepository.existsByCourseIdAndStudentId(courseId, studentId)) {
            throw new DuplicateReviewException("Student has already reviewed this course");
        }

        // Create review
        CourseReview review = new CourseReview();
        review.setCourse(course);
        review.setStudentId(studentId);
        review.setRating(rating);
        review.setReviewText(reviewText);
        review.setIsApproved(false); // Requires approval

        CourseReview savedReview = reviewRepository.save(review);
        log.info("Review created successfully with ID: {}", savedReview.getId());

        // Publish event
        eventPublisher.publishEvent(new ReviewCreatedEvent(this, savedReview));

        return savedReview;
    }

    @Override
    @Transactional
    public CourseReview updateReview(Long reviewId, Long studentId, Integer rating, String reviewText) {
        log.info("Updating review {} by student {}", reviewId, studentId);

        // Validate rating
        if (rating < 1 || rating > 5) {
            throw new InvalidRatingException("Rating must be between 1 and 5");
        }

        CourseReview review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new ResourceNotFoundException("Review not found with ID: " + reviewId));

        // Check authorization
        if (!review.getStudentId().equals(studentId)) {
            throw new UnauthorizedException("You can only update your own reviews");
        }

        // Update review
        review.setRating(rating);
        review.setReviewText(reviewText);
        review.setIsApproved(false); // Requires re-approval after edit

        CourseReview updatedReview = reviewRepository.save(review);
        log.info("Review updated successfully");

        return updatedReview;
    }

    @Override
    @Transactional
    public void deleteReview(Long reviewId, Long studentId) {
        log.info("Deleting review {} by student {}", reviewId, studentId);

        CourseReview review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new ResourceNotFoundException("Review not found with ID: " + reviewId));

        // Check authorization
        if (!review.getStudentId().equals(studentId)) {
            throw new UnauthorizedException("You can only delete your own reviews");
        }

        reviewRepository.delete(review);
        log.info("Review deleted successfully");
    }

    @Override
    @Transactional(readOnly = true)
    public CourseReview getReviewById(Long reviewId) {
        return reviewRepository.findById(reviewId)
                .orElseThrow(() -> new ResourceNotFoundException("Review not found with ID: " + reviewId));
    }

    @Override
    @Transactional(readOnly = true)
    public Page<CourseReview> getApprovedReviewsByCourse(Long courseId, Pageable pageable) {
        // FIXED: Using correct repository method
        return reviewRepository.findByCourseIdAndIsApprovedTrue(courseId, pageable);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<CourseReview> getAllReviewsByCourse(Long courseId, Pageable pageable) {
        // FIXED: Using correct repository method
        return reviewRepository.findByCourseId(courseId, pageable);
    }

    @Override
    @Transactional(readOnly = true)
    public CourseReview getStudentReviewForCourse(Long courseId, Long studentId) {
        // USING CORRECT METHOD
        return reviewRepository.findByCourseIdAndStudentId(courseId, studentId).orElse(null);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<CourseReview> getReviewsByStudent(Long studentId, Pageable pageable) {
        // USING REPOSITORY METHOD
        return reviewRepository.findByStudentId(studentId, pageable);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<CourseReview> getPendingReviews(Pageable pageable) {
        // USING REPOSITORY METHOD
        return reviewRepository.findByIsApprovedFalse(pageable);
    }

    @Override
    @Transactional
    public CourseReview approveReview(Long reviewId) {
        log.info("Approving review {}", reviewId);

        CourseReview review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new ResourceNotFoundException("Review not found with ID: " + reviewId));

        review.setIsApproved(true);
        CourseReview approvedReview = reviewRepository.save(review);
        log.info("Review approved successfully");

        // Publish event
        eventPublisher.publishEvent(new ReviewApprovedEvent(this, approvedReview));

        return approvedReview;
    }

    @Override
    @Transactional
    public void rejectReview(Long reviewId) {
        log.info("Rejecting review {}", reviewId);

        CourseReview review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new ResourceNotFoundException("Review not found with ID: " + reviewId));

        reviewRepository.delete(review);
        log.info("Review rejected and deleted");
    }

    @Override
    @Transactional(readOnly = true)
    public Double getAverageRating(Long courseId) {
        // USING CORRECT METHOD
        Double avgRating = reviewRepository.calculateAverageRating(courseId);
        return avgRating != null ? avgRating : 0.0;
    }

    @Override
    @Transactional(readOnly = true)
    public long getReviewCount(Long courseId) {
        // USING CORRECT METHOD
        return reviewRepository.countByCourseIdAndIsApprovedTrue(courseId);
    }

    @Override
    @Transactional(readOnly = true)
    public Map<Integer, Long> getRatingDistribution(Long courseId) {
        Map<Integer, Long> distribution = new HashMap<>();

        // Initialize with 0 for all ratings
        for (int i = 1; i <= 5; i++) {
            distribution.put(i, 0L);
        }

        // Get distribution from database - USING CORRECT METHOD
        Object[][] results = reviewRepository.getRatingDistribution(courseId);
        for (Object[] result : results) {
            Integer rating = (Integer) result[0];
            Long count = (Long) result[1];
            distribution.put(rating, count);
        }

        return distribution;
    }

    @Override
    @Transactional(readOnly = true)
    public boolean hasStudentReviewedCourse(Long courseId, Long studentId) {
        // USING CORRECT METHOD
        return reviewRepository.existsByCourseIdAndStudentId(courseId, studentId);
    }
}
