package com.edumind.lms.modules.course.service;

import com.edumind.lms.modules.course.entity.Wishlist;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface WishlistService {

    /**
     * Add course to wishlist
     * @param studentId Student ID
     * @param courseId Course ID
     * @return Created wishlist item
     */
    Wishlist addToWishlist(Long studentId, Long courseId);

    /**
     * Remove course from wishlist
     * @param studentId Student ID
     * @param courseId Course ID
     */
    void removeFromWishlist(Long studentId, Long courseId);

    /**
     * Get student's wishlist
     * @param studentId Student ID
     * @param pageable Pagination
     * @return Page of wishlist items
     */
    Page<Wishlist> getWishlist(Long studentId, Pageable pageable);

    /**
     * Check if course is in wishlist
     * @param studentId Student ID
     * @param courseId Course ID
     * @return true if in wishlist
     */
    boolean isInWishlist(Long studentId, Long courseId);

    /**
     * Get wishlist item count for student
     * @param studentId Student ID
     * @return Wishlist item count
     */
    long getWishlistCount(Long studentId);

    /**
     * Clear all wishlist items for student
     * @param studentId Student ID
     */
    void clearWishlist(Long studentId);
}
