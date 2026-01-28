package com.edumind.lms.modules.payment.service;

import com.edumind.lms.modules.course.entity.Course;
import com.edumind.lms.modules.course.enums.EnrollmentStatus;
import com.edumind.lms.modules.course.repository.CourseRepository;
import com.edumind.lms.modules.course.repository.EnrollmentRepository;
import com.edumind.lms.modules.payment.dto.request.AddToCartRequest;
import com.edumind.lms.modules.payment.dto.response.CartItemResponse;
import com.edumind.lms.modules.payment.dto.response.CartResponse;
import com.edumind.lms.modules.payment.entity.Cart;
import com.edumind.lms.modules.payment.entity.CartItem;
import com.edumind.lms.modules.payment.exception.CartItemNotFoundException;
import com.edumind.lms.modules.payment.exception.CourseAlreadyInCartException;
import com.edumind.lms.modules.payment.exception.CourseAlreadyPurchasedException;
import com.edumind.lms.modules.payment.exception.CourseNotAvailableException;
import com.edumind.lms.modules.payment.repository.CartItemRepository;
import com.edumind.lms.modules.payment.repository.CartRepository;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;

@Slf4j
@Service
@RequiredArgsConstructor
public class CartServiceImpl implements CartService {

    private final CartRepository cartRepository;
    private final CartItemRepository cartItemRepository;
    private final CourseRepository courseRepository;
    private final EnrollmentRepository enrollmentRepository;

    @Override
    @Transactional(readOnly = true)
    public CartResponse getCart(Long userId) {
        log.debug("Getting cart for user: {}", userId);

        Cart cart = getOrCreateCart(userId);
        return buildCartResponse(cart);
    }

    @Override
    @Transactional
    public CartResponse addToCart(Long userId, AddToCartRequest request) {
        Long courseId = request.getCourseId();
        log.info("Adding course {} to cart for user {}", courseId, userId);

        // Validate course exists and is available
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new CourseNotAvailableException(courseId));

        // Check if course is published
        if (!course.isPublished()) {
            throw new CourseNotAvailableException(courseId);
        }

        // Use existsByCourseIdAndStudentIdAndStatusNot to exclude DROPPED enrollments
        // This makes the check consistent with checkout flow, allowing re-enrollment after drop
        if (enrollmentRepository.existsByCourseIdAndStudentIdAndStatusNot(courseId, userId, EnrollmentStatus.DROPPED)) {
            throw new CourseAlreadyPurchasedException(courseId);
        }

        // Get or create cart
        Cart cart = getOrCreateCart(userId);

        // Check if course already in cart
        if (cartItemRepository.existsByCartIdAndCourseId(cart.getId(), courseId)) {
            throw new CourseAlreadyInCartException(courseId);
        }

        // Add item to cart
        CartItem item = new CartItem();
        item.setCart(cart);
        item.setCourseId(courseId);
        item.setAddedAt(LocalDateTime.now());

        // Snapshot price at time of adding (in case price changes later)
        item.setPriceSnapshot(course.getPrice() != null ? course.getPrice() : BigDecimal.ZERO);

        // Handle race condition - if another request added the same item concurrently,
        // the unique constraint (cart_id, course_id) will throw DataIntegrityViolationException
        try {
            cartItemRepository.save(item);
        } catch (DataIntegrityViolationException e) {
            log.warn("Concurrent add to cart detected for user {} and course {}", userId, courseId);
            throw new CourseAlreadyInCartException(courseId);
        }

        // Update cart timestamp
        cart.setUpdatedAt(LocalDateTime.now());
        cartRepository.save(cart);

        // Refresh cart
        cart = cartRepository.findByIdWithItems(cart.getId()).orElse(cart);

        log.info("Course {} added to cart for user {}", courseId, userId);

        return buildCartResponse(cart);
    }

    @Override
    @Transactional
    public CartResponse removeFromCart(Long userId, Long courseId) {
        log.info("Removing course {} from cart for user {}", courseId, userId);

        Cart cart = cartRepository.findByUserId(userId)
                .orElseThrow(() -> new CartItemNotFoundException(courseId));

        CartItem item = cartItemRepository.findByCartIdAndCourseId(cart.getId(), courseId)
                .orElseThrow(() -> new CartItemNotFoundException(courseId));

        cartItemRepository.delete(item);

        // Update cart timestamp when items are removed
        cart.setUpdatedAt(LocalDateTime.now());
        cartRepository.save(cart);

        // Refresh cart
        cart = cartRepository.findByIdWithItems(cart.getId()).orElse(cart);

        log.info("Course {} removed from cart for user {}", courseId, userId);

        return buildCartResponse(cart);
    }

    @Override
    @Transactional
    public void clearCart(Long userId) {
        log.info("Clearing cart for user {}", userId);

        cartRepository.findByUserId(userId).ifPresent(cart -> {
            cartItemRepository.deleteAllByCartId(cart.getId());
            log.info("Cart cleared for user {}", userId);
        });
    }

    @Override
    @Transactional(readOnly = true)
    public int getCartItemCount(Long userId) {
        return cartRepository.findByUserId(userId)
                .map(cart -> cartItemRepository.countByCartId(cart.getId()))
                .orElse(0);
    }

    @Override
    @Transactional(readOnly = true)
    public boolean isInCart(Long userId, Long courseId) {
        return cartRepository.findByUserId(userId)
                .map(cart -> cartItemRepository.existsByCartIdAndCourseId(cart.getId(), courseId))
                .orElse(false);
    }

    @Override
    @Transactional
    public void removeItems(Long userId, List<Long> courseIds) {
        if (courseIds == null || courseIds.isEmpty()) {
            return;
        }

        log.info("Removing {} course(s) from cart for user {}", courseIds.size(), userId);

        cartRepository.findByUserId(userId).ifPresent(cart -> {
            cartItemRepository.deleteByCartIdAndCourseIds(cart.getId(), courseIds);
            log.info("Removed {} course(s) from cart for user {}", courseIds.size(), userId);
        });
    }

    // ===== Private Helpers =====

    /**
     * Get existing cart or create a new one for the user.
     * Handle race condition where two concurrent requests both try to create a cart.
     * Requires unique constraint on user_id in carts table.
     */
    private Cart getOrCreateCart(Long userId) {
        return cartRepository.findByUserId(userId)
                .orElseGet(() -> {
                    Cart newCart = new Cart();
                    newCart.setUserId(userId);
                    newCart.setCreatedAt(LocalDateTime.now());
                    newCart.setUpdatedAt(LocalDateTime.now());
                    try {
                        return cartRepository.save(newCart);
                    } catch (DataIntegrityViolationException e) {
                        // Another thread created the cart concurrently, fetch it
                        log.debug("Concurrent cart creation detected for user {}, fetching existing cart", userId);
                        return cartRepository.findByUserId(userId)
                                .orElseThrow(() -> new IllegalStateException(
                                        "Failed to create or find cart for user: " + userId));
                    }
                });
    }

    /**
     * Build cart response with course details and availability checks.
     * Include isAvailable flag for courses that become unavailable after adding to cart.
     */
    private CartResponse buildCartResponse(Cart cart) {
        List<CartItem> items = cartItemRepository.findByCartId(cart.getId());

        if (items.isEmpty()) {
             return CartResponse.builder()
                .id(cart.getId())
                .userId(cart.getUserId())
                .items(new ArrayList<>())
                .itemCount(0)
                .subtotal(BigDecimal.ZERO)
                .discountTotal(BigDecimal.ZERO)
                .totalAmount(BigDecimal.ZERO)
                .currency("USD")
                .createdAt(cart.getCreatedAt())
                .updatedAt(cart.getUpdatedAt())
                .build();
        }

        Set<Long> courseIds = items.stream()
                .map(CartItem::getCourseId)
                .collect(Collectors.toSet());

        Map<Long, Course> courseMap = courseRepository.findAllById(courseIds).stream()
                .collect(Collectors.toMap(Course::getId, Function.identity()));

        List<CartItemResponse> itemResponses = new ArrayList<>();
        BigDecimal subtotal = BigDecimal.ZERO;
        BigDecimal totalDiscount = BigDecimal.ZERO;
        int availableItemCount = 0;

        for (CartItem item : items) {
            Course course = courseMap.get(item.getCourseId());

            // Handle case where course was deleted or not found
            if (course == null) {
                CartItemResponse itemResponse = CartItemResponse.builder()
                        .courseId(item.getCourseId())
                        .courseTitle("Course no longer available")
                        .addedAt(item.getAddedAt())
                        .isAvailable(false)
                        .unavailableReason("Course has been removed")
                        .build();
                itemResponses.add(itemResponse);
                continue;
            }

            BigDecimal originalPrice = course.getPrice() != null ? course.getPrice() : BigDecimal.ZERO;
            BigDecimal finalPrice = course.getEffectivePrice();
            BigDecimal discount = originalPrice.subtract(finalPrice);

            // Check if course is still published/available
            boolean isAvailable = course.isPublished();
            String unavailableReason = null;
            if (!isAvailable) {
                unavailableReason = "Course is no longer published";
            }

            CartItemResponse itemResponse = CartItemResponse.builder()
                    .courseId(course.getId())
                    .courseTitle(course.getTitle())
                    .courseSlug(course.getSlug())
                    .courseThumbnailUrl(course.getThumbnailUrl())
                    .instructorId(course.getInstructorId())
                    .instructorName(course.getInstructorName())
                    .originalPrice(originalPrice)
                    .discountAmount(discount)
                    .effectivePrice(finalPrice)
                    .currency(course.getCurrency() != null ? course.getCurrency() : "USD")
                    .addedAt(item.getAddedAt())
                    .isAvailable(isAvailable)
                    .unavailableReason(unavailableReason)
                    .build();

            itemResponses.add(itemResponse);

            // Only include available items in totals
            if (isAvailable) {
                subtotal = subtotal.add(originalPrice);
                totalDiscount = totalDiscount.add(discount);
                availableItemCount++;
            }
        }

        BigDecimal totalAmount = subtotal.subtract(totalDiscount);

        CartResponse response = CartResponse.builder()
                .id(cart.getId())
                .userId(cart.getUserId())
                .items(itemResponses)
                .itemCount(availableItemCount) // Only count available items
                .subtotal(subtotal)
                .discountTotal(totalDiscount)
                .totalAmount(totalAmount)
                .currency("USD")
                .createdAt(cart.getCreatedAt())
                .updatedAt(cart.getUpdatedAt())
                .build();

        return response;
    }
}
