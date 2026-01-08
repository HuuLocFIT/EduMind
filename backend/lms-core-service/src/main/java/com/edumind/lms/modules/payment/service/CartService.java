package com.edumind.lms.modules.payment.service;

import com.edumind.lms.modules.payment.dto.request.AddToCartRequest;
import com.edumind.lms.modules.payment.dto.response.CartResponse;

/**
 * Service to manage user shopping cart.
 */
public interface CartService {

    /**
     * Get current user's cart
     */
    CartResponse getCart(Long userId);

    /**
     * Add course to cart
     */
    CartResponse addToCart(Long userId, AddToCartRequest request);

    /**
     * Remove course from cart
     */
    CartResponse removeFromCart(Long userId, Long courseId);

    /**
     * Clear all items from cart
     */
    void clearCart(Long userId);

    /**
     * Get cart item count
     */
    int getCartItemCount(Long userId);

    /**
     * Check if course is in cart
     */
    boolean isInCart(Long userId, Long courseId);
}
