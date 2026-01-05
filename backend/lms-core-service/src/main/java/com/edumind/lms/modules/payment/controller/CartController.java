package com.edumind.lms.modules.payment.controller;

import com.edumind.common.response.ApiResponse;
import com.edumind.lms.modules.payment.dto.request.AddToCartRequest;
import com.edumind.lms.modules.payment.dto.response.CartResponse;
import com.edumind.lms.modules.payment.service.CartService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/cart")
@RequiredArgsConstructor
@Slf4j
@PreAuthorize("hasAnyRole('STUDENT', 'TEACHER')")
public class CartController {
    private final CartService cartService;

    // ==================== Cart Item Operations ====================

    /**
     * Add course to cart
     * POST /cart/items
     */
    @PostMapping("/items")
    public ResponseEntity<ApiResponse<CartResponse>> addToCart(
            @Valid @RequestBody AddToCartRequest request,
            Authentication authentication) {

        Long userId = extractUserId(authentication);
        log.info("User {} adding course {} to cart", userId, request.getCourseId());

        CartResponse cart = cartService.addToCart(userId, request);

        return ResponseEntity.ok(ApiResponse.success("Course added to cart successfully", cart));
    }

    /**
     * Get current user's cart
     * GET /cart
     */
    @GetMapping
    public ResponseEntity<ApiResponse<CartResponse>> getCart(Authentication authentication) {

        Long userId = extractUserId(authentication);
        log.debug("Getting cart for user {}", userId);

        CartResponse cart = cartService.getCart(userId);

        return ResponseEntity.ok(ApiResponse.success(cart));
    }

    /**
     * Remove course from cart
     * DELETE /cart/items/{courseId}
     */
    @DeleteMapping("/items/{courseId}")
    public ResponseEntity<ApiResponse<CartResponse>> removeFromCart(
            @PathVariable Long courseId,
            Authentication authentication) {

        Long userId = extractUserId(authentication);
        log.info("User {} removing course {} from cart", userId, courseId);

        CartResponse cart = cartService.removeFromCart(userId, courseId);

        return ResponseEntity.ok(ApiResponse.success("Course removed from cart", cart));
    }

    /**
     * Clear entire cart
     * DELETE /cart
     */
    @DeleteMapping
    public ResponseEntity<ApiResponse<Void>> clearCart(Authentication authentication) {

        Long userId = extractUserId(authentication);
        log.info("User {} clearing cart", userId);

        cartService.clearCart(userId);

        return ResponseEntity.ok(ApiResponse.success("Cart cleared successfully", null));
    }

    // ==================== Cart Info ====================

    /**
     * Get cart item count (for badge display)
     * GET /cart/count
     */
    @GetMapping("/count")
    public ResponseEntity<ApiResponse<Integer>> getCartItemCount(Authentication authentication) {

        Long userId = extractUserId(authentication);
        int count = cartService.getCartItemCount(userId);

        return ResponseEntity.ok(ApiResponse.success(count));
    }

    /**
     * Check if course is in cart
     * GET /cart/check/{courseId}
     */
    @GetMapping("/check/{courseId}")
    public ResponseEntity<ApiResponse<Boolean>> isInCart(
            @PathVariable Long courseId,
            Authentication authentication) {

        Long userId = extractUserId(authentication);
        boolean inCart = cartService.isInCart(userId, courseId);

        return ResponseEntity.ok(ApiResponse.success(inCart));
    }

    // ==================== Helper Methods ====================

    private Long extractUserId(Authentication authentication) {
        return Long.valueOf(authentication.getPrincipal().toString());
    }
}