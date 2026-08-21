package com.edumind.lms.modules.course.controller;

import com.edumind.common.response.ApiResponse;
import com.edumind.common.response.PagedResponse;
import com.edumind.lms.modules.course.dto.request.CreateReviewRequest;
import com.edumind.lms.modules.course.dto.request.InstructorReplyRequest;
import com.edumind.lms.modules.course.dto.request.UpdateReviewRequest;
import com.edumind.lms.modules.course.dto.response.InstructorReviewsStatsResponse;
import com.edumind.lms.modules.course.dto.response.RatingDistributionResponse;
import com.edumind.lms.modules.course.dto.response.ReviewResponse;
import com.edumind.lms.modules.course.dto.response.UserPublicProfileResponse;
import com.edumind.lms.modules.course.entity.CourseReview;
import com.edumind.lms.modules.course.service.CourseReviewService;
import com.edumind.lms.shared.client.UserClient;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/reviews")
@RequiredArgsConstructor
public class CourseReviewController {
    private final CourseReviewService reviewService;
    private final UserClient userClient;

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

        String message = review.getIsApproved() 
                ? "Review created and published successfully" 
                : "Review created successfully (pending approval)";

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(
                        message,
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
    @PreAuthorize("hasAnyRole('STUDENT', 'ADMIN')")
    public ResponseEntity<ApiResponse<Void>> deleteReview(
            @PathVariable Long reviewId,
            Authentication authentication) {

        Long userId = extractUserId(authentication);
        boolean isAdmin = authentication.getAuthorities().stream()
                .anyMatch(auth -> "ROLE_ADMIN".equals(auth.getAuthority()));
        
        if (isAdmin) {
            // Admin can delete any review (for moderation purposes)
            reviewService.adminDeleteReview(reviewId);
            return ResponseEntity.ok(ApiResponse.success("Review deleted by admin", null));
        } else {
            // Students can only delete their own reviews
            reviewService.deleteReview(reviewId, userId);
            return ResponseEntity.ok(ApiResponse.success("Review deleted successfully", null));
        }
    }

    @GetMapping("/{reviewId}")
    public ResponseEntity<ApiResponse<ReviewResponse>> getReviewById(@PathVariable Long reviewId) {
        CourseReview review = reviewService.getReviewById(reviewId);
        return ResponseEntity.ok(ApiResponse.success(toResponse(review)));
    }

    @GetMapping("/courses/{courseId}")
    public ResponseEntity<PagedResponse<ReviewResponse>> getCourseReviews(
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
        Page<ReviewResponse> responsePage = reviews.map(this::toResponse);

        return ResponseEntity.ok(PagedResponse.of(
            responsePage.getContent(),
            responsePage.getNumber(),
            responsePage.getSize(),
            responsePage.getTotalElements(),
            responsePage.getTotalPages()
        ));
    }

    @GetMapping("/courses/{courseId}/all")
    @PreAuthorize("@teacherSecurity.isActiveTeacherOrAdmin()")
    public ResponseEntity<PagedResponse<ReviewResponse>> getAllCourseReviews(
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
        Page<ReviewResponse> responsePage = reviews.map(this::toResponse);

        return ResponseEntity.ok(PagedResponse.of(
            responsePage.getContent(),
            responsePage.getNumber(),
            responsePage.getSize(),
            responsePage.getTotalElements(),
            responsePage.getTotalPages()
        ));
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
    public ResponseEntity<PagedResponse<ReviewResponse>> getMyReviews(
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
        Page<ReviewResponse> responsePage = reviews.map(this::toResponse);

        return ResponseEntity.ok(PagedResponse.of(
            responsePage.getContent(),
            responsePage.getNumber(),
            responsePage.getSize(),
            responsePage.getTotalElements(),
            responsePage.getTotalPages()
        ));
    }

    @GetMapping("/pending")
    @PreAuthorize("@teacherSecurity.isActiveTeacherOrAdmin()")
    public ResponseEntity<PagedResponse<ReviewResponse>> getPendingReviews(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDir) {

        Sort sort = sortDir.equalsIgnoreCase("asc")
                ? Sort.by(sortBy).ascending()
                : Sort.by(sortBy).descending();
        Pageable pageable = PageRequest.of(page, size, sort);

        Page<CourseReview> reviews = reviewService.getPendingReviews(pageable);
        Page<ReviewResponse> responsePage = reviews.map(this::toResponse);

        return ResponseEntity.ok(PagedResponse.of(
            responsePage.getContent(),
            responsePage.getNumber(),
            responsePage.getSize(),
            responsePage.getTotalElements(),
            responsePage.getTotalPages()
        ));
    }

    @PostMapping("/{reviewId}/approve")
    @PreAuthorize("@teacherSecurity.isActiveTeacherOrAdmin()")
    public ResponseEntity<ApiResponse<ReviewResponse>> approveReview(
            @PathVariable Long reviewId,
            Authentication authentication) {
        Long userId = extractUserId(authentication);
        boolean isAdmin = authentication.getAuthorities().stream()
                .anyMatch(auth -> "ROLE_ADMIN".equals(auth.getAuthority()));

        CourseReview review = reviewService.approveReview(reviewId, userId, isAdmin);
        return ResponseEntity.ok(ApiResponse.success(
                "Review approved successfully",
                toResponse(review)
        ));
    }

    @DeleteMapping("/{reviewId}/reject")
    @PreAuthorize("@teacherSecurity.isActiveTeacherOrAdmin()")
    public ResponseEntity<ApiResponse<Void>> rejectReview(
            @PathVariable Long reviewId,
            Authentication authentication) {
        Long userId = extractUserId(authentication);
        boolean isAdmin = authentication.getAuthorities().stream()
                .anyMatch(auth -> "ROLE_ADMIN".equals(auth.getAuthority()));

        reviewService.rejectReview(reviewId, userId, isAdmin);
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

    @GetMapping("/config/auto-approve-enabled")
    public ResponseEntity<ApiResponse<Boolean>> isAutoApproveEnabled() {
        boolean enabled = reviewService.isAutoApproveEnabled();
        return ResponseEntity.ok(ApiResponse.success(
                "Auto-approve is " + (enabled ? "enabled" : "disabled"),
                enabled
        ));
    }

    /**
     * Get all reviews for instructor's courses with filters
     */
    @GetMapping("/instructor/my-reviews")
    @PreAuthorize("@teacherSecurity.isActiveTeacher()")
    public ResponseEntity<PagedResponse<ReviewResponse>> getInstructorReviews(
            @RequestParam(required = false) Long courseId,
            @RequestParam(required = false) Integer rating,
            @RequestParam(required = false) Boolean hasReply,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDir,
            Authentication authentication) {

        Long instructorId = extractUserId(authentication);

        Sort sort = sortDir.equalsIgnoreCase("asc")
                ? Sort.by(sortBy).ascending()
                : Sort.by(sortBy).descending();
        Pageable pageable = PageRequest.of(page, size, sort);

        Page<CourseReview> reviews = reviewService.getInstructorReviews(
                instructorId,
                courseId,
                rating,
                hasReply,
                pageable
        );
        Page<ReviewResponse> responsePage = reviews.map(this::toResponse);

        return ResponseEntity.ok(PagedResponse.of(
                responsePage.getContent(),
                responsePage.getNumber(),
                responsePage.getSize(),
                responsePage.getTotalElements(),
                responsePage.getTotalPages()
        ));
    }

    /**
     * Get instructor reviews statistics
     */
    @GetMapping("/instructor/my-reviews/stats")
    @PreAuthorize("@teacherSecurity.isActiveTeacher()")
    public ResponseEntity<ApiResponse<InstructorReviewsStatsResponse>> getInstructorReviewsStats(
            Authentication authentication) {

        Long instructorId = extractUserId(authentication);
        InstructorReviewsStatsResponse stats = reviewService.getInstructorReviewsStats(instructorId);

        return ResponseEntity.ok(ApiResponse.success(stats));
    }

    /**
     * Get courses with reviews for filter dropdown
     */
    @GetMapping("/instructor/my-reviews/courses")
    @PreAuthorize("@teacherSecurity.isActiveTeacher()")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getInstructorCoursesWithReviews(
            Authentication authentication) {

        Long instructorId = extractUserId(authentication);
        List<Map<String, Object>> courses = reviewService.getInstructorCoursesWithReviews(instructorId);

        return ResponseEntity.ok(ApiResponse.success(courses));
    }

    /**
     * Reply to a review
     */
    @PostMapping("/{reviewId}/reply")
    @PreAuthorize("@teacherSecurity.isActiveTeacher()")
    public ResponseEntity<ApiResponse<ReviewResponse>> replyToReview(
            @PathVariable Long reviewId,
            @Valid @RequestBody InstructorReplyRequest request,
            Authentication authentication) {

        Long instructorId = extractUserId(authentication);

        CourseReview review = reviewService.replyToReview(
                reviewId,
                instructorId,
                request.getReply()
        );

        return ResponseEntity.ok(ApiResponse.success(
                "Reply added successfully",
                toResponse(review)
        ));
    }

    /**
     * Update reply to a review
     */
    @PutMapping("/{reviewId}/reply")
    @PreAuthorize("@teacherSecurity.isActiveTeacher()")
    public ResponseEntity<ApiResponse<ReviewResponse>> updateReply(
            @PathVariable Long reviewId,
            @Valid @RequestBody InstructorReplyRequest request,
            Authentication authentication) {

        Long instructorId = extractUserId(authentication);

        CourseReview review = reviewService.replyToReview(
                reviewId,
                instructorId,
                request.getReply()
        );

        return ResponseEntity.ok(ApiResponse.success(
                "Reply updated successfully",
                toResponse(review)
        ));
    }

    /**
     * Delete reply from a review
     */
    @DeleteMapping("/{reviewId}/reply")
    @PreAuthorize("@teacherSecurity.isActiveTeacher()")
    public ResponseEntity<ApiResponse<ReviewResponse>> deleteReply(
            @PathVariable Long reviewId,
            Authentication authentication) {

        Long instructorId = extractUserId(authentication);
        CourseReview review = reviewService.deleteReply(reviewId, instructorId);

        return ResponseEntity.ok(ApiResponse.success(
                "Reply deleted successfully",
                toResponse(review)
        ));
    }

    // Helper methods
    private Long extractUserId(Authentication authentication) {
        return Long.parseLong(authentication.getName());
    }

    private ReviewResponse toResponse(CourseReview review) {
        String studentName = "Student #" + review.getStudentId();
        String avatarUrl = null;
        String profilePictureUrl = null;

        try {
            ApiResponse<UserPublicProfileResponse> userResponse = userClient.getUserPublicProfile(review.getStudentId());
            if (userResponse != null && userResponse.getData() != null) {
                UserPublicProfileResponse user = userResponse.getData();

                if (user.getDisplayName() != null && !user.getDisplayName().isBlank()) {
                    studentName = user.getDisplayName();
                } else if (user.getFirstName() != null || user.getLastName() != null) {
                    StringBuilder nameBuilder = new StringBuilder();
                    if (user.getFirstName() != null && !user.getFirstName().isBlank()) {
                        nameBuilder.append(user.getFirstName());
                    }
                    if (user.getLastName() != null && !user.getLastName().isBlank()) {
                        if (nameBuilder.length() > 0) {
                            nameBuilder.append(" ");
                        }
                        nameBuilder.append(user.getLastName());
                    }
                    if (nameBuilder.length() > 0) {
                        studentName = nameBuilder.toString();
                    }
                }

                avatarUrl = user.getAvatarUrl();
                profilePictureUrl = user.getProfilePictureUrl();
            }
        } catch (Exception e) {
            log.warn("Failed to fetch user details for student ID: {}. Using default name.",
                    review.getStudentId(), e);
        }

        return ReviewResponse.builder()
                .id(review.getId())
                .courseId(review.getCourse().getId())
                .courseTitle(review.getCourse().getTitle())
                .courseThumbnailUrl(review.getCourse().getThumbnailUrl())
                .studentId(review.getStudentId())
                .studentName(studentName)
                .avatarUrl(avatarUrl)
                .profilePictureUrl(profilePictureUrl)
                .rating(review.getRating())
                .comment(review.getReviewText())
                .isApproved(review.getIsApproved())
                .isFlagged(review.getIsFlagged())
                .createdAt(review.getCreatedAt())
                .updatedAt(review.getUpdatedAt())
                .instructorReply(review.getInstructorReply())
                .instructorReplyAt(review.getInstructorReplyAt())
                .hasReply(review.hasInstructorReply())
                .build();
    }
}
