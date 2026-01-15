package com.edumind.lms.modules.payment.service;

import com.edumind.lms.modules.course.entity.Course;
import com.edumind.lms.modules.course.enums.CourseStatus;
import com.edumind.lms.modules.course.repository.CourseRepository;
import com.edumind.lms.modules.course.repository.EnrollmentRepository;
import com.edumind.lms.modules.payment.dto.request.AddToCartRequest;
import com.edumind.lms.modules.payment.dto.response.CartResponse;
import com.edumind.lms.modules.payment.entity.Cart;
import com.edumind.lms.modules.payment.entity.CartItem;
import com.edumind.lms.modules.payment.exception.CartItemNotFoundException;
import com.edumind.lms.modules.payment.exception.CourseAlreadyInCartException;
import com.edumind.lms.modules.payment.exception.CourseAlreadyPurchasedException;
import com.edumind.lms.modules.payment.exception.CourseNotAvailableException;
import com.edumind.lms.modules.payment.repository.CartItemRepository;
import com.edumind.lms.modules.payment.repository.CartRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("CartService Unit Tests")
class CartServiceTest {

    @Mock
    private CartRepository cartRepository;

    @Mock
    private CartItemRepository cartItemRepository;

    @Mock
    private CourseRepository courseRepository;

    @Mock
    private EnrollmentRepository enrollmentRepository;

    @InjectMocks
    private CartServiceImpl cartService;

    private Long userId = 1L;
    private Long courseId = 100L;
    private Cart cart;
    private Course course;

    @BeforeEach
    void setUp() {
        cart = new Cart();
        cart.setId(10L);
        cart.setUserId(userId);
        cart.setCreatedAt(LocalDateTime.now());
        cart.setUpdatedAt(LocalDateTime.now());

        course = Course.builder()
                .title("Test Course")
                .slug("test-course")
                .price(new BigDecimal("99.99"))
                .currency("USD")
                .status(CourseStatus.PUBLISHED)
                .publishedAt(LocalDateTime.now())
                .instructorId(50L)
                .instructorName("Test Instructor")
                .build();
        // Set ID via reflection since it's auto-generated
        ReflectionTestUtils.setField(course, "id", courseId);
    }

    @Nested
    @DisplayName("getCart Tests")
    class GetCartTests {

        @Test
        @DisplayName("Should return cart for existing user")
        void getCart_ExistingUser_ReturnsCart() {
            // Given
            when(cartRepository.findByUserId(userId)).thenReturn(Optional.of(cart));
            when(cartItemRepository.findByCartId(cart.getId())).thenReturn(Collections.emptyList());

            // When
            CartResponse response = cartService.getCart(userId);

            // Then
            assertThat(response).isNotNull();
            assertThat(response.getUserId()).isEqualTo(userId);
            assertThat(response.getItemCount()).isZero();
        }

        @Test
        @DisplayName("Should create new cart for new user")
        void getCart_NewUser_CreatesCart() {
            // Given
            when(cartRepository.findByUserId(userId)).thenReturn(Optional.empty());
            when(cartRepository.save(any(Cart.class))).thenReturn(cart);
            when(cartItemRepository.findByCartId(anyLong())).thenReturn(Collections.emptyList());

            // When
            CartResponse response = cartService.getCart(userId);

            // Then
            assertThat(response).isNotNull();
            verify(cartRepository).save(any(Cart.class));
        }
    }

    @Nested
    @DisplayName("addToCart Tests")
    class AddToCartTests {

        @Test
        @DisplayName("Should add course to cart successfully")
        void addToCart_ValidCourse_AddsToCart() {
            // Given
            AddToCartRequest request = new AddToCartRequest();
            request.setCourseId(courseId);

            when(courseRepository.findById(courseId)).thenReturn(Optional.of(course));
            when(enrollmentRepository.existsByUserIdAndCourseId(userId, courseId)).thenReturn(false);
            when(cartRepository.findByUserId(userId)).thenReturn(Optional.of(cart));
            when(cartItemRepository.existsByCartIdAndCourseId(cart.getId(), courseId)).thenReturn(false);
            when(cartItemRepository.save(any(CartItem.class))).thenAnswer(inv -> inv.getArgument(0));
            when(cartRepository.findByIdWithItems(cart.getId())).thenReturn(Optional.of(cart));
            when(cartItemRepository.findByCartId(cart.getId())).thenReturn(Collections.emptyList());

            // When
            CartResponse response = cartService.addToCart(userId, request);

            // Then
            assertThat(response).isNotNull();
            // Verify price snapshot
            verify(cartItemRepository).save(argThat(item -> 
                item.getPriceSnapshot().compareTo(course.getPrice()) == 0
            ));
        }

        @Test
        @DisplayName("Should throw exception for non-existent course")
        void addToCart_CourseNotFound_ThrowsException() {
            // Given
            AddToCartRequest request = new AddToCartRequest();
            request.setCourseId(courseId);

            when(courseRepository.findById(courseId)).thenReturn(Optional.empty());

            // When & Then
            assertThatThrownBy(() -> cartService.addToCart(userId, request))
                    .isInstanceOf(CourseNotAvailableException.class);
        }

        @Test
        @DisplayName("Should throw exception for unpublished course")
        void addToCart_UnpublishedCourse_ThrowsException() {
            // Given
            AddToCartRequest request = new AddToCartRequest();
            request.setCourseId(courseId);
            course.setStatus(CourseStatus.DRAFT);

            when(courseRepository.findById(courseId)).thenReturn(Optional.of(course));

            // When & Then
            assertThatThrownBy(() -> cartService.addToCart(userId, request))
                    .isInstanceOf(CourseNotAvailableException.class);
        }

        @Test
        @DisplayName("Should throw exception if user already enrolled")
        void addToCart_AlreadyEnrolled_ThrowsException() {
            // Given
            AddToCartRequest request = new AddToCartRequest();
            request.setCourseId(courseId);

            when(courseRepository.findById(courseId)).thenReturn(Optional.of(course));
            when(enrollmentRepository.existsByUserIdAndCourseId(userId, courseId)).thenReturn(true);

            // When & Then
            assertThatThrownBy(() -> cartService.addToCart(userId, request))
                    .isInstanceOf(CourseAlreadyPurchasedException.class);
        }

        @Test
        @DisplayName("Should throw exception if course already in cart")
        void addToCart_AlreadyInCart_ThrowsException() {
            // Given
            AddToCartRequest request = new AddToCartRequest();
            request.setCourseId(courseId);

            when(courseRepository.findById(courseId)).thenReturn(Optional.of(course));
            when(enrollmentRepository.existsByUserIdAndCourseId(userId, courseId)).thenReturn(false);
            when(cartRepository.findByUserId(userId)).thenReturn(Optional.of(cart));
            when(cartItemRepository.existsByCartIdAndCourseId(cart.getId(), courseId)).thenReturn(true);

            // When & Then
            assertThatThrownBy(() -> cartService.addToCart(userId, request))
                    .isInstanceOf(CourseAlreadyInCartException.class);
        }
    }

    @Nested
    @DisplayName("removeFromCart Tests")
    class RemoveFromCartTests {

        @Test
        @DisplayName("Should remove course from cart successfully")
        void removeFromCart_ExistingItem_RemovesItem() {
            // Given
            CartItem item = new CartItem();
            item.setId(1L);
            item.setCourseId(courseId);
            item.setCart(cart);

            when(cartRepository.findByUserId(userId)).thenReturn(Optional.of(cart));
            when(cartItemRepository.findByCartIdAndCourseId(cart.getId(), courseId)).thenReturn(Optional.of(item));
            when(cartRepository.findByIdWithItems(cart.getId())).thenReturn(Optional.of(cart));
            when(cartItemRepository.findByCartId(cart.getId())).thenReturn(Collections.emptyList());

            // When
            CartResponse response = cartService.removeFromCart(userId, courseId);

            // Then
            assertThat(response).isNotNull();
            verify(cartItemRepository).delete(item);
        }

        @Test
        @DisplayName("Should throw exception if item not in cart")
        void removeFromCart_ItemNotFound_ThrowsException() {
            // Given
            when(cartRepository.findByUserId(userId)).thenReturn(Optional.of(cart));
            when(cartItemRepository.findByCartIdAndCourseId(cart.getId(), courseId)).thenReturn(Optional.empty());

            // When & Then
            assertThatThrownBy(() -> cartService.removeFromCart(userId, courseId))
                    .isInstanceOf(CartItemNotFoundException.class);
        }
    }

    @Nested
    @DisplayName("clearCart Tests")
    class ClearCartTests {

        @Test
        @DisplayName("Should clear all items from cart")
        void clearCart_ExistingCart_ClearsItems() {
            // Given
            when(cartRepository.findByUserId(userId)).thenReturn(Optional.of(cart));

            // When
            cartService.clearCart(userId);

            // Then
            verify(cartItemRepository).deleteAllByCartId(cart.getId());
        }

        @Test
        @DisplayName("Should do nothing if cart does not exist")
        void clearCart_NoCart_DoesNothing() {
            // Given
            when(cartRepository.findByUserId(userId)).thenReturn(Optional.empty());

            // When
            cartService.clearCart(userId);

            // Then
            verify(cartItemRepository, never()).deleteAllByCartId(anyLong());
        }
    }

    @Nested
    @DisplayName("getCartItemCount Tests")
    class GetCartItemCountTests {

        @Test
        @DisplayName("Should return item count")
        void getCartItemCount_ExistingCart_ReturnsCount() {
            // Given
            when(cartRepository.findByUserId(userId)).thenReturn(Optional.of(cart));
            when(cartItemRepository.countByCartId(cart.getId())).thenReturn(3);

            // When
            int count = cartService.getCartItemCount(userId);

            // Then
            assertThat(count).isEqualTo(3);
        }

        @Test
        @DisplayName("Should return zero if no cart")
        void getCartItemCount_NoCart_ReturnsZero() {
            // Given
            when(cartRepository.findByUserId(userId)).thenReturn(Optional.empty());

            // When
            int count = cartService.getCartItemCount(userId);

            // Then
            assertThat(count).isZero();
        }
    }

    @Nested
    @DisplayName("isInCart Tests")
    class IsInCartTests {

        @Test
        @DisplayName("Should return true if course is in cart")
        void isInCart_CourseInCart_ReturnsTrue() {
            // Given
            when(cartRepository.findByUserId(userId)).thenReturn(Optional.of(cart));
            when(cartItemRepository.existsByCartIdAndCourseId(cart.getId(), courseId)).thenReturn(true);

            // When
            boolean result = cartService.isInCart(userId, courseId);

            // Then
            assertThat(result).isTrue();
        }

        @Test
        @DisplayName("Should return false if course is not in cart")
        void isInCart_CourseNotInCart_ReturnsFalse() {
            // Given
            when(cartRepository.findByUserId(userId)).thenReturn(Optional.of(cart));
            when(cartItemRepository.existsByCartIdAndCourseId(cart.getId(), courseId)).thenReturn(false);

            // When
            boolean result = cartService.isInCart(userId, courseId);

            // Then
            assertThat(result).isFalse();
        }

        @Test
        @DisplayName("Should return false if no cart exists")
        void isInCart_NoCart_ReturnsFalse() {
            // Given
            when(cartRepository.findByUserId(userId)).thenReturn(Optional.empty());

            // When
            boolean result = cartService.isInCart(userId, courseId);

            // Then
            assertThat(result).isFalse();
        }
    }

    @Nested
    @DisplayName("removeItems Tests")
    class RemoveItemsTests {

        @Test
        @DisplayName("Should remove specific items from cart when cart exists")
        void removeItems_CartExists_RemovesItems() {
            // Given
            when(cartRepository.findByUserId(userId)).thenReturn(Optional.of(cart));

            // When
            cartService.removeItems(userId, List.of(100L, 101L));

            // Then
            verify(cartItemRepository).deleteByCartIdAndCourseIds(eq(cart.getId()), eq(List.of(100L, 101L)));
        }

        @Test
        @DisplayName("Should do nothing when courseIds is null/empty")
        void removeItems_NullOrEmpty_DoesNothing() {
            // When
            cartService.removeItems(userId, null);
            cartService.removeItems(userId, Collections.emptyList());

            // Then
            verifyNoInteractions(cartRepository);
            verifyNoInteractions(cartItemRepository);
        }

        @Test
        @DisplayName("Should do nothing when cart does not exist")
        void removeItems_NoCart_DoesNothing() {
            // Given
            when(cartRepository.findByUserId(userId)).thenReturn(Optional.empty());

            // When
            cartService.removeItems(userId, List.of(courseId));

            // Then
            verify(cartItemRepository, never()).deleteByCartIdAndCourseIds(anyLong(), any());
        }
    }

    @Nested
    @DisplayName("Price Calculation Tests")
    class PriceCalculationTests {

        @Test
        @DisplayName("Should calculate totals correctly for multiple items")
        void buildCartResponse_MultipleItems_CalculatesCorrectly() {
            // Given
            // Item 1: $100, No Discount
            Long courseId1 = 101L;
            Course course1 = Course.builder()
                    .title("Course 1")
                    .price(new BigDecimal("100.00"))
                    .build();
            ReflectionTestUtils.setField(course1, "id", courseId1);
            
            CartItem item1 = new CartItem();
            item1.setCourseId(courseId1);
            item1.setCart(cart);

            // Item 2: $200, $50 Discount (Effective $150)
            Long courseId2 = 102L;
            Course course2 = Course.builder()
                    .title("Course 2")
                    .price(new BigDecimal("200.00"))
                    .discountPrice(new BigDecimal("150.00")) // Assuming effective price logic handles this
                    .build();
            ReflectionTestUtils.setField(course2, "id", courseId2);
            
            CartItem item2 = new CartItem();
            item2.setCourseId(courseId2);
            item2.setCart(cart);

            when(cartRepository.findByUserId(userId)).thenReturn(Optional.of(cart));
            when(cartItemRepository.findByCartId(cart.getId())).thenReturn(Arrays.asList(item1, item2));
            when(courseRepository.findAllById(anyCollection())).thenReturn(Arrays.asList(course1, course2));

            // When
            CartResponse response = cartService.getCart(userId);

            // Then
            assertThat(response).isNotNull();
            assertThat(response.getItemCount()).isEqualTo(2);
            
            // Subtotal: 100 + 200 = 300
            assertThat(response.getSubtotal()).isEqualByComparingTo(new BigDecimal("300.00"));
            
            // Discount: (100-100) + (200-150) = 0 + 50 = 50
            assertThat(response.getDiscountTotal()).isEqualByComparingTo(new BigDecimal("50.00"));
            
            // Total: 300 - 50 = 250 (or 100 + 150)
            assertThat(response.getTotalAmount()).isEqualByComparingTo(new BigDecimal("250.00"));
        }
    }
}
