package com.edumind.lms.modules.course.controller;

import com.edumind.common.response.ApiResponse;
import com.edumind.lms.modules.course.dto.response.WishlistItemResponse;
import com.edumind.lms.modules.course.entity.Course;
import com.edumind.lms.modules.course.entity.Wishlist;
import com.edumind.lms.modules.course.service.CourseReviewService;
import com.edumind.lms.modules.course.service.WishlistService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/wishlist")
@RequiredArgsConstructor
@PreAuthorize("hasRole('STUDENT')")
public class WishlistController {

    private final WishlistService wishlistService;
    private final CourseReviewService reviewService;

    @PostMapping("/courses/{courseId}")
    public ResponseEntity<ApiResponse<WishlistItemResponse>> addToWishlist(
            @PathVariable Long courseId,
            Authentication authentication) {

        Long studentId = extractUserId(authentication);
        Wishlist wishlist = wishlistService.addToWishlist(studentId, courseId);

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(
                        "Course added to wishlist",
                        toResponse(wishlist)
                ));
    }

    @DeleteMapping("/courses/{courseId}")
    public ResponseEntity<ApiResponse<Void>> removeFromWishlist(
            @PathVariable Long courseId,
            Authentication authentication) {

        Long studentId = extractUserId(authentication);
        wishlistService.removeFromWishlist(studentId, courseId);

        return ResponseEntity.ok(ApiResponse.success("Course removed from wishlist", null));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<Page<WishlistItemResponse>>> getWishlist(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            Authentication authentication) {

        Long studentId = extractUserId(authentication);
        Pageable pageable = PageRequest.of(page, size);

        Page<Wishlist> wishlist = wishlistService.getWishlist(studentId, pageable);
        Page<WishlistItemResponse> response = wishlist.map(this::toResponse);

        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/courses/{courseId}/check")
    public ResponseEntity<ApiResponse<Boolean>> isInWishlist(
            @PathVariable Long courseId,
            Authentication authentication) {

        Long studentId = extractUserId(authentication);
        boolean isInWishlist = wishlistService.isInWishlist(studentId, courseId);

        return ResponseEntity.ok(ApiResponse.success(isInWishlist));
    }

    @GetMapping("/count")
    public ResponseEntity<ApiResponse<Long>> getWishlistCount(Authentication authentication) {
        Long studentId = extractUserId(authentication);
        long count = wishlistService.getWishlistCount(studentId);

        return ResponseEntity.ok(ApiResponse.success(count));
    }

    @DeleteMapping("/clear")
    public ResponseEntity<ApiResponse<Void>> clearWishlist(Authentication authentication) {
        Long studentId = extractUserId(authentication);
        wishlistService.clearWishlist(studentId);

        return ResponseEntity.ok(ApiResponse.success("Wishlist cleared", null));
    }

    // Helper methods
    private Long extractUserId(Authentication authentication) {
        return Long.parseLong(authentication.getName());
    }

    private WishlistItemResponse toResponse(Wishlist wishlist) {
        Course course = wishlist.getCourse();

        // Get course ratings
        Double averageRating = reviewService.getAverageRating(course.getId());
        long reviewCount = reviewService.getReviewCount(course.getId());

        return WishlistItemResponse.builder()
                .id(wishlist.getId())
                .courseId(course.getId())
                .courseTitle(course.getTitle())
                .courseSlug(course.getSlug())
                .thumbnailUrl(course.getThumbnailUrl())
                .price(course.getPrice())
                .discountPrice(course.getDiscountPrice())
                .level(course.getLevel())
                .instructorId(course.getInstructorId())
                .instructorName("Instructor #" + course.getInstructorId()) // TODO: Fetch from User Service
                .rating(averageRating)
                .reviewCount(reviewCount)
                .addedAt(wishlist.getCreatedAt())
                .build();
    }
}
