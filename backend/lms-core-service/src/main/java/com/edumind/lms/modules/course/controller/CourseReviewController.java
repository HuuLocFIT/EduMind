package com.edumind.lms.modules.course.controller;

import com.edumind.common.response.ApiResponse;
import com.edumind.lms.modules.course.dto.request.CreateReviewRequest;
import com.edumind.lms.modules.course.dto.request.UpdateReviewRequest;
import com.edumind.lms.modules.course.dto.response.RatingDistributionResponse;
import com.edumind.lms.modules.course.dto.response.ReviewResponse;
import com.edumind.lms.modules.course.entity.CourseReview;
import com.edumind.lms.modules.course.service.CourseReviewService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/reviews")
@RequiredArgsConstructor
public class CourseReviewController {
    private final CourseReviewService reviewService;

    @PostMapping("/courses/{courseId}")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<ApiResponse<ReviewResponse>> createReview(
            @PathVariable Long courseId,
            @Valid @RequestBody CreateReviewRequest request,
            Authentication authentication) {

        Long studentId = extractUserId(authentication);

        CourseReview review = reviewService.createReview(
                courseId,
                studentId,
                request.getRating(),
                request.getComment()
        );

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(
                        "Review created successfully (pending approval)",
                        toResponse(review)
                ));
    }

    @PutMapping("/{reviewId}")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<ApiResponse<ReviewResponse>> updateReview(
            @PathVariable Long reviewId,
            @Valid @RequestBody UpdateReviewRequest request,
            Authentication authentication) {

        Long studentId = extractUserId(authentication);

        CourseReview review = reviewService.updateReview(
                reviewId,
                studentId,
                request.getRating(),
                request.getComment()
        );

        return ResponseEntity.ok(ApiResponse.success(
                "Review updated successfully",
                toResponse(review)
        ));
    }

    @DeleteMapping("/{reviewId}")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<ApiResponse<Void>> deleteReview(
            @PathVariable Long reviewId,
            Authentication authentication) {

        Long studentId = extractUserId(authentication);
        reviewService.deleteReview(reviewId, studentId);

        return ResponseEntity.ok(ApiResponse.success("Review deleted successfully", null));
    }

    @GetMapping("/{reviewId}")
    public ResponseEntity<ApiResponse<ReviewResponse>> getReviewById(@PathVariable Long reviewId) {
        CourseReview review = reviewService.getReviewById(reviewId);
        return ResponseEntity.ok(ApiResponse.success(toResponse(review)));
    }

    @GetMapping("/courses/{courseId}")
    public ResponseEntity<ApiResponse<Page<ReviewResponse>>> getCourseReviews(
            @PathVariable Long courseId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDir) {

        Sort sort = sortDir.equalsIgnoreCase("asc")
                ? Sort.by(sortBy).ascending()
                : Sort.by(sortBy).descending();
        Pageable pageable = PageRequest.of(page, size, sort);

        Page<CourseReview> reviews = reviewService.getApprovedReviewsByCourse(courseId, pageable);
        Page<ReviewResponse> response = reviews.map(this::toResponse);

        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/courses/{courseId}/all")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    public ResponseEntity<ApiResponse<Page<ReviewResponse>>> getAllCourseReviews(
            @PathVariable Long courseId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDir) {

        Sort sort = sortDir.equalsIgnoreCase("asc")
                ? Sort.by(sortBy).ascending()
                : Sort.by(sortBy).descending();
        Pageable pageable = PageRequest.of(page, size, sort);

        Page<CourseReview> reviews = reviewService.getAllReviewsByCourse(courseId, pageable);
        Page<ReviewResponse> response = reviews.map(this::toResponse);

        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/courses/{courseId}/my-review")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<ApiResponse<ReviewResponse>> getMyReview(
            @PathVariable Long courseId,
            Authentication authentication) {

        Long studentId = extractUserId(authentication);
        CourseReview review = reviewService.getStudentReviewForCourse(courseId, studentId);

        if (review == null) {
            return ResponseEntity.ok(ApiResponse.success("No review found", null));
        }

        return ResponseEntity.ok(ApiResponse.success(toResponse(review)));
    }

    @GetMapping("/my-reviews")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<ApiResponse<Page<ReviewResponse>>> getMyReviews(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDir,
            Authentication authentication) {

        Long studentId = extractUserId(authentication);

        Sort sort = sortDir.equalsIgnoreCase("asc")
                ? Sort.by(sortBy).ascending()
                : Sort.by(sortBy).descending();
        Pageable pageable = PageRequest.of(page, size, sort);

        Page<CourseReview> reviews = reviewService.getReviewsByStudent(studentId, pageable);
        Page<ReviewResponse> response = reviews.map(this::toResponse);

        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/pending")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    public ResponseEntity<ApiResponse<Page<ReviewResponse>>> getPendingReviews(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDir) {

        Sort sort = sortDir.equalsIgnoreCase("asc")
                ? Sort.by(sortBy).ascending()
                : Sort.by(sortBy).descending();
        Pageable pageable = PageRequest.of(page, size, sort);

        Page<CourseReview> reviews = reviewService.getPendingReviews(pageable);
        Page<ReviewResponse> response = reviews.map(this::toResponse);

        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PostMapping("/{reviewId}/approve")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    public ResponseEntity<ApiResponse<ReviewResponse>> approveReview(@PathVariable Long reviewId) {
        CourseReview review = reviewService.approveReview(reviewId);
        return ResponseEntity.ok(ApiResponse.success(
                "Review approved successfully",
                toResponse(review)
        ));
    }

    @DeleteMapping("/{reviewId}/reject")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    public ResponseEntity<ApiResponse<Void>> rejectReview(@PathVariable Long reviewId) {
        reviewService.rejectReview(reviewId);
        return ResponseEntity.ok(ApiResponse.success("Review rejected and deleted", null));
    }

    @GetMapping("/courses/{courseId}/rating-distribution")
    public ResponseEntity<ApiResponse<RatingDistributionResponse>> getRatingDistribution(
            @PathVariable Long courseId) {

        Double averageRating = reviewService.getAverageRating(courseId);
        long totalReviews = reviewService.getReviewCount(courseId);
        Map<Integer, Long> distribution = reviewService.getRatingDistribution(courseId);

        RatingDistributionResponse response = RatingDistributionResponse.builder()
                .courseId(courseId)
                .averageRating(averageRating)
                .totalReviews(totalReviews)
                .distribution(distribution)
                .build();

        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/courses/{courseId}/has-reviewed")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<ApiResponse<Boolean>> hasReviewed(
            @PathVariable Long courseId,
            Authentication authentication) {

        Long studentId = extractUserId(authentication);
        boolean hasReviewed = reviewService.hasStudentReviewedCourse(courseId, studentId);

        return ResponseEntity.ok(ApiResponse.success(hasReviewed));
    }

    // Helper methods
    private Long extractUserId(Authentication authentication) {
        return Long.parseLong(authentication.getName());
    }

    private ReviewResponse toResponse(CourseReview review) {
        return ReviewResponse.builder()
                .id(review.getId())
                .courseId(review.getCourse().getId())
                .courseTitle(review.getCourse().getTitle())
                .studentId(review.getStudentId())
                .studentName("Student #" + review.getStudentId()) // TODO: Fetch from User Service
                .rating(review.getRating())
                .comment(review.getReviewText())
                .isApproved(review.getIsApproved())
                .createdAt(review.getCreatedAt())
                .updatedAt(review.getUpdatedAt())
                .build();
    }
}
