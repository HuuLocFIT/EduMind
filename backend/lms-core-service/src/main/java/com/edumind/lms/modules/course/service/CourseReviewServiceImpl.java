package com.edumind.lms.modules.course.service;

import com.edumind.lms.modules.course.config.ReviewConfigProperties;
import com.edumind.lms.modules.course.dto.response.InstructorReviewsStatsResponse;
import com.edumind.lms.modules.course.entity.Course;
import com.edumind.lms.modules.course.entity.CourseReview;
import com.edumind.lms.modules.course.entity.Enrollment;
import com.edumind.lms.modules.course.enums.EnrollmentStatus;
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

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class CourseReviewServiceImpl implements CourseReviewService {
    private final CourseReviewRepository reviewRepository;
    private final CourseRepository courseRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final ApplicationEventPublisher eventPublisher;
    private final ReviewConfigProperties reviewConfig;

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

        // Business rules:
        // - DROPPED: enrollment has been cancelled; student should not be able to leave new reviews.
        // - SUSPENDED: enrollment is temporarily blocked; student cannot leave or update reviews while suspended,
        //   but existing published reviews remain visible.
        if (enrollment.getStatus() == EnrollmentStatus.DROPPED) {
            throw new NotEnrolledException("Your enrollment for this course has been cancelled. You cannot review this course anymore.");
        }
        if (enrollment.getStatus() == EnrollmentStatus.SUSPENDED) {
            throw new NotEnrolledException("Your access to this course is suspended. You cannot leave a review at this time.");
        }

        // Check if student has already reviewed - USING CORRECT METHOD
        if (reviewRepository.existsByCourseIdAndStudentId(courseId, studentId)) {
            throw new DuplicateReviewException("Student has already reviewed this course");
        }

        // Create review
        CourseReview review = new CourseReview();
        review.setCourse(course);
        review.setEnrollment(enrollment);
        review.setStudentId(studentId);
        review.setRating(rating);
        review.setReviewText(reviewText);
        
        // Determine if review should be auto-approved
        boolean autoApprove = shouldAutoApprove(rating);
        review.setIsApproved(autoApprove);
        log.info("Review auto-approve status: {} (enabled: {}, threshold: {}, rating: {})", 
                autoApprove, reviewConfig.isAutoApproveEnabled(), reviewConfig.getAutoApproveThreshold(), rating);

        CourseReview savedReview = reviewRepository.save(review);
        
        // Refresh aggregates if approved
        if (autoApprove) {
            refreshCourseAggregates(course);
        }
        
        // Reload with associations to ensure they're available
        CourseReview reloaded = reviewRepository.findByIdWithAssociations(savedReview.getId())
                .orElse(savedReview);
        log.info("Review created successfully with ID: {} (approved: {})", reloaded.getId(), autoApprove);

        // Publish event
        eventPublisher.publishEvent(new ReviewCreatedEvent(this, reloaded));

        return reloaded;
    }

    @Override
    @Transactional
    public CourseReview updateReview(Long reviewId, Long studentId, Integer rating, String reviewText) {
        log.info("Updating review {} by student {}", reviewId, studentId);

        // Validate rating
        if (rating < 1 || rating > 5) {
            throw new InvalidRatingException("Rating must be between 1 and 5");
        }

        CourseReview review = reviewRepository.findByIdWithAssociations(reviewId)
                .orElseThrow(() -> new ResourceNotFoundException("Review not found with ID: " + reviewId));

        // Check authorization
        if (!review.getStudentId().equals(studentId)) {
            throw new UnauthorizedException("You can only update your own reviews");
        }

        // Track current approval state
        boolean wasApproved = Boolean.TRUE.equals(review.getIsApproved());

        // Update review
        review.setRating(rating);
        review.setReviewText(reviewText);
        review.setIsApproved(false); // Requires re-approval after edit

        CourseReview updatedReview = reviewRepository.save(review);

        // If it was approved before, refresh aggregates since it is now pending
        if (wasApproved) {
            refreshCourseAggregates(review.getCourse());
        }

        // Reload with associations to ensure they're available
        CourseReview reloaded = reviewRepository.findByIdWithAssociations(reviewId)
                .orElse(updatedReview);
        log.info("Review updated successfully");

        return reloaded;
    }

    @Override
    @Transactional
    public void deleteReview(Long reviewId, Long studentId) {
        log.info("Deleting review {} by student {}", reviewId, studentId);

        CourseReview review = reviewRepository.findByIdWithAssociations(reviewId)
                .orElseThrow(() -> new ResourceNotFoundException("Review not found with ID: " + reviewId));

        // Check authorization
        if (!review.getStudentId().equals(studentId)) {
            throw new UnauthorizedException("You can only delete your own reviews");
        }

        // If review was approved, decrease totalReviews
        if (review.getIsApproved()) {
            Course course = review.getCourse();
            course.setTotalReviews(Math.max(0, (course.getTotalReviews() != null ? course.getTotalReviews() : 0) - 1));
            courseRepository.save(course);
            log.info("Course {} totalReviews updated to: {}", course.getId(), course.getTotalReviews());
        }

        reviewRepository.delete(review);
        log.info("Review deleted successfully");
    }

    @Override
    @Transactional(readOnly = true)
    public CourseReview getReviewById(Long reviewId) {
        return reviewRepository.findByIdWithAssociations(reviewId)
                .orElseThrow(() -> new ResourceNotFoundException("Review not found with ID: " + reviewId));
    }

    @Override
    @Transactional(readOnly = true)
    public Page<CourseReview> getApprovedReviewsByCourse(Long courseId, Pageable pageable) {
        return reviewRepository.findByCourseIdAndIsApprovedTrueWithAssociations(courseId, pageable);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<CourseReview> getAllReviewsByCourse(Long courseId, Pageable pageable) {
        return reviewRepository.findByCourseIdWithAssociations(courseId, pageable);
    }

    @Override
    @Transactional(readOnly = true)
    public CourseReview getStudentReviewForCourse(Long courseId, Long studentId) {
        return reviewRepository.findByCourseIdAndStudentIdWithAssociations(courseId, studentId).orElse(null);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<CourseReview> getReviewsByStudent(Long studentId, Pageable pageable) {
        return reviewRepository.findByStudentIdWithAssociations(studentId, pageable);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<CourseReview> getPendingReviews(Pageable pageable) {
        return reviewRepository.findByIsApprovedFalseWithAssociations(pageable);
    }

    @Override
    @Transactional
    public CourseReview approveReview(Long reviewId) {
        log.info("Approving review {}", reviewId);

        CourseReview review = reviewRepository.findByIdWithAssociations(reviewId)
                .orElseThrow(() -> new ResourceNotFoundException("Review not found with ID: " + reviewId));

        // Only update if not already approved
        if (!review.getIsApproved()) {
            review.setIsApproved(true);
            reviewRepository.save(review);
            
            // Refresh aggregates after approval
            refreshCourseAggregates(review.getCourse());
        }
        
        // Reload with associations to ensure they're available
        CourseReview reloaded = reviewRepository.findByIdWithAssociations(reviewId)
                .orElse(review);
        log.info("Review approved successfully");

        // Publish event
        eventPublisher.publishEvent(new ReviewApprovedEvent(this, reloaded));

        return reloaded;
    }

    @Override
    @Transactional
    public void rejectReview(Long reviewId) {
        log.info("Rejecting review {}", reviewId);

        CourseReview review = reviewRepository.findByIdWithAssociations(reviewId)
                .orElseThrow(() -> new ResourceNotFoundException("Review not found with ID: " + reviewId));

        // If review was approved, refresh aggregates after removal
        Course course = review.getCourse();
        boolean wasApproved = Boolean.TRUE.equals(review.getIsApproved());

        reviewRepository.delete(review);
        if (wasApproved) {
            refreshCourseAggregates(course);
        }
        log.info("Review rejected and deleted");
    }

    @Override
    @Transactional
    public void adminDeleteReview(Long reviewId) {
        log.info("Admin deleting review {}", reviewId);

        CourseReview review = reviewRepository.findByIdWithAssociations(reviewId)
                .orElseThrow(() -> new ResourceNotFoundException("Review not found with ID: " + reviewId));

        // If review was approved, refresh aggregates after removal
        Course course = review.getCourse();
        boolean wasApproved = Boolean.TRUE.equals(review.getIsApproved());

        reviewRepository.delete(review);
        if (wasApproved) {
            refreshCourseAggregates(course);
        }
        log.info("Review deleted by admin successfully");
    }

    @Override
    @Transactional(readOnly = true)
    public Double getAverageRating(Long courseId) {
        Double avgRating = reviewRepository.calculateAverageRating(courseId);
        return avgRating != null ? avgRating : 0.0;
    }

    @Override
    @Transactional(readOnly = true)
    public long getReviewCount(Long courseId) {
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
        return reviewRepository.existsByCourseIdAndStudentId(courseId, studentId);
    }

    @Override
    @Transactional(readOnly = true)
    public boolean isAutoApproveEnabled() {
        return reviewConfig.isAutoApproveEnabled();
    }

    @Override
    @Transactional(readOnly = true)
    public boolean shouldAutoApprove(Integer rating) {
        if (!reviewConfig.isAutoApproveEnabled()) {
            return false;
        }
        
        // If threshold is set, check if rating meets the threshold
        Integer threshold = reviewConfig.getAutoApproveThreshold();
        if (threshold != null && threshold > 0) {
            return rating >= threshold;
        }
        
        // If no threshold, auto-approve all
        return true;
    }

    // Recalculate and persist course averageRating and totalReviews from approved reviews
    private void refreshCourseAggregates(Course course) {
        Long courseId = course.getId();
        long approvedCount = reviewRepository.countByCourseIdAndIsApprovedTrue(courseId);
        
        course.setTotalReviews(Math.toIntExact(approvedCount));
        
        // Set averageRating based on constraint: NULL when totalReviews = 0, otherwise calculate average
        if (approvedCount == 0) {
            course.setAverageRating(null);
            log.info("Refreshed aggregates for course {} -> totalReviews: 0, averageRating: NULL",
                    courseId);
        } else {
            Double avg = reviewRepository.calculateAverageRating(courseId);
            BigDecimal avgBd = BigDecimal.valueOf(avg != null ? avg : 0.0)
                    .setScale(2, RoundingMode.HALF_UP);
            course.setAverageRating(avgBd);
            log.info("Refreshed aggregates for course {} -> totalReviews: {}, averageRating: {}",
                    courseId, approvedCount, avgBd);
        }
        
        courseRepository.save(course);
    }

    @Override
    @Transactional
    public CourseReview replyToReview(Long reviewId, Long instructorId, String reply) {
        CourseReview review = reviewRepository.findByIdWithAssociations(reviewId)
                .orElseThrow(() -> new ResourceNotFoundException("Review not found with id: " + reviewId));

        // Verify instructor owns the course
        if (!review.getCourse().getInstructorId().equals(instructorId)) {
            throw new UnauthorizedException("You can only reply to reviews on your own courses");
        }

        // Verify review is approved
        if (!review.getIsApproved()) {
            throw new IllegalStateException("Cannot reply to unapproved reviews");
        }

        // Set reply with timestamp
        review.setInstructorReplyWithTimestamp(reply);

        log.info("Instructor {} replied to review {} on course {}",
                instructorId, reviewId, review.getCourse().getId());

        return reviewRepository.save(review);
    }

    @Override
    @Transactional
    public CourseReview deleteReply(Long reviewId, Long instructorId) {
        CourseReview review = reviewRepository.findByIdWithAssociations(reviewId)
                .orElseThrow(() -> new ResourceNotFoundException("Review not found with id: " + reviewId));

        // Verify instructor owns the course
        if (!review.getCourse().getInstructorId().equals(instructorId)) {
            throw new UnauthorizedException("You can only delete replies on your own courses");
        }

        // Clear reply
        review.clearInstructorReply();

        log.info("Instructor {} deleted reply on review {} for course {}",
                instructorId, reviewId, review.getCourse().getId());

        return reviewRepository.save(review);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<CourseReview> getInstructorReviews(
            Long instructorId,
            Long courseId,
            Integer rating,
            Boolean hasReply,
            Pageable pageable) {

        return reviewRepository.findInstructorReviews(
                instructorId,
                courseId,
                rating,
                hasReply,
                pageable
        );
    }

    @Override
    @Transactional(readOnly = true)
    public InstructorReviewsStatsResponse getInstructorReviewsStats(Long instructorId) {
        long totalReviews = reviewRepository.countInstructorReviews(instructorId);
        Double averageRating = reviewRepository.calculateInstructorAverageRating(instructorId);
        long repliedCount = reviewRepository.countInstructorRepliedReviews(instructorId);

        // Build rating distribution map
        Map<Integer, Long> distribution = new LinkedHashMap<>();
        // Initialize all ratings to 0
        for (int i = 5; i >= 1; i--) {
            distribution.put(i, 0L);
        }

        // Fill with actual counts
        List<Object[]> rawDistribution = reviewRepository.getInstructorRatingDistribution(instructorId);
        for (Object[] row : rawDistribution) {
            Integer ratingValue = ((Number) row[0]).intValue();
            Long count = ((Number) row[1]).longValue();
            distribution.put(ratingValue, count);
        }

        return InstructorReviewsStatsResponse.builder()
                .totalReviews(totalReviews)
                .averageRating(averageRating != null ? averageRating : 0.0)
                .repliedCount(repliedCount)
                .needReplyCount(totalReviews - repliedCount)
                .ratingDistribution(distribution)
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public List<Map<String, Object>> getInstructorCoursesWithReviews(Long instructorId) {
        List<Object[]> rawData = reviewRepository.findInstructorCoursesWithReviews(instructorId);

        return rawData.stream()
                .map(row -> {
                    Map<String, Object> course = new HashMap<>();
                    course.put("id", row[0]);
                    course.put("title", row[1]);
                    return course;
                })
                .collect(Collectors.toList());
    }
}
