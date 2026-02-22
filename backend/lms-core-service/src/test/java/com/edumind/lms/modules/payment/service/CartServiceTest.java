package com.edumind.lms.modules.payment.service;

import com.edumind.lms.modules.course.entity.Course;
import com.edumind.lms.modules.course.enums.CourseStatus;
import com.edumind.lms.modules.course.repository.CourseRepository;
import com.edumind.lms.modules.course.repository.EnrollmentRepository;
import com.edumind.lms.modules.course.api.CourseQueryService;
import com.edumind.lms.modules.course.api.EnrollmentQueryService;
import com.edumind.lms.modules.course.api.dto.CourseInfo;
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
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
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
import org.mockito.ArgumentCaptor;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
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

    @Mock
    private CourseQueryService courseQueryService;

    @Mock
    private EnrollmentQueryService enrollmentQueryService;

    @InjectMocks
    private CartServiceImpl cartService;

    private Long userId = 1L;
    private Long courseId = 100L;
    private Cart cart;
    private Course course;
    private CourseInfo courseInfo;

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

        courseInfo = new CourseInfo(
                course.getId(),
                course.getTitle(),
                course.getSlug(),
                course.getThumbnailUrl(),
                course.getPrice(),
                course.getDiscountPrice(),
                course.getEffectivePrice(),
                course.getOriginalPrice(),
                course.isPublished(),
                course.getInstructorId(),
                course.getInstructorName(),
                course.getCurrency()
        );

        // Default stubs for new ACL dependencies (tests can override as needed).
        lenient().when(courseQueryService.getCourseInfo(anyLong())).thenReturn(Optional.of(courseInfo));
        lenient().when(courseQueryService.getCourseInfoBatch(anyCollection())).thenReturn(java.util.Map.of(courseId, courseInfo));
        lenient().when(enrollmentQueryService.isStudentEnrolledExcludingDropped(anyLong(), anyLong())).thenReturn(false);
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

            when(courseQueryService.getCourseInfo(courseId)).thenReturn(Optional.of(courseInfo));
            when(enrollmentQueryService.isStudentEnrolledExcludingDropped(courseId, userId)).thenReturn(false);
            when(cartRepository.findByUserId(userId)).thenReturn(Optional.of(cart));
            when(cartItemRepository.existsByCartIdAndCourseId(cart.getId(), courseId)).thenReturn(false);
            when(cartItemRepository.save(any(CartItem.class))).thenAnswer(inv -> inv.getArgument(0));
            when(cartRepository.findByIdWithItems(cart.getId())).thenReturn(Optional.of(cart));
            when(cartItemRepository.findByCartId(cart.getId())).thenReturn(Collections.emptyList());
            when(cartRepository.save(any(Cart.class))).thenReturn(cart);

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

            when(courseQueryService.getCourseInfo(courseId)).thenReturn(Optional.empty());

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

            CourseInfo unpublishedInfo = new CourseInfo(
                    course.getId(),
                    course.getTitle(),
                    course.getSlug(),
                    course.getThumbnailUrl(),
                    course.getPrice(),
                    course.getDiscountPrice(),
                    course.getEffectivePrice(),
                    course.getOriginalPrice(),
                    false,
                    course.getInstructorId(),
                    course.getInstructorName(),
                    course.getCurrency()
            );

            when(courseQueryService.getCourseInfo(courseId)).thenReturn(Optional.of(unpublishedInfo));

            // When & Then
            assertThatThrownBy(() -> cartService.addToCart(userId, request))
                    .isInstanceOf(CourseNotAvailableException.class);
        }

        @Test
        @DisplayName("Should throw exception if user already enrolled (excluding DROPPED)")
        void addToCart_AlreadyEnrolled_ThrowsException() {
            // Given
            AddToCartRequest request = new AddToCartRequest();
            request.setCourseId(courseId);

            when(courseQueryService.getCourseInfo(courseId)).thenReturn(Optional.of(courseInfo));
            when(enrollmentQueryService.isStudentEnrolledExcludingDropped(courseId, userId)).thenReturn(true);

            // When & Then
            assertThatThrownBy(() -> cartService.addToCart(userId, request))
                    .isInstanceOf(CourseAlreadyPurchasedException.class);
        }

        @Test
        @DisplayName("Should allow adding course if previous enrollment was DROPPED")
        void addToCart_PreviouslyDropped_AllowsReEnrollment() {
            // Given
            AddToCartRequest request = new AddToCartRequest();
            request.setCourseId(courseId);

            when(courseQueryService.getCourseInfo(courseId)).thenReturn(Optional.of(courseInfo));
            // User previously DROPPED (or never enrolled), so query returns false
            when(enrollmentQueryService.isStudentEnrolledExcludingDropped(courseId, userId)).thenReturn(false);
            when(cartRepository.findByUserId(userId)).thenReturn(Optional.of(cart));
            when(cartItemRepository.existsByCartIdAndCourseId(cart.getId(), courseId)).thenReturn(false);
            when(cartItemRepository.save(any(CartItem.class))).thenAnswer(inv -> inv.getArgument(0));
            when(cartRepository.findByIdWithItems(cart.getId())).thenReturn(Optional.of(cart));
            when(cartItemRepository.findByCartId(cart.getId())).thenReturn(Collections.emptyList());

            // When
            CartResponse response = cartService.addToCart(userId, request);

            // Then
            assertThat(response).isNotNull();
            // Should allow re-enrollment after DROPPED status
            verify(cartItemRepository).save(any(CartItem.class));
        }

        @Test
        @DisplayName("Should throw exception if course already in cart")
        void addToCart_AlreadyInCart_ThrowsException() {
            // Given
            AddToCartRequest request = new AddToCartRequest();
            request.setCourseId(courseId);

            when(courseQueryService.getCourseInfo(courseId)).thenReturn(Optional.of(courseInfo));
            when(enrollmentQueryService.isStudentEnrolledExcludingDropped(courseId, userId)).thenReturn(false);
            when(cartRepository.findByUserId(userId)).thenReturn(Optional.of(cart));
            when(cartItemRepository.existsByCartIdAndCourseId(cart.getId(), courseId)).thenReturn(true);

            // When & Then
            assertThatThrownBy(() -> cartService.addToCart(userId, request))
                    .isInstanceOf(CourseAlreadyInCartException.class);
        }

        @Test
        @DisplayName("Should handle race condition when adding duplicate cart item concurrently")
        void addToCart_ConcurrentDuplicateItem_ThrowsCourseAlreadyInCartException() {
            // Given
            AddToCartRequest request = new AddToCartRequest();
            request.setCourseId(courseId);

            when(courseQueryService.getCourseInfo(courseId)).thenReturn(Optional.of(courseInfo));
            when(enrollmentQueryService.isStudentEnrolledExcludingDropped(courseId, userId)).thenReturn(false);
            when(cartRepository.findByUserId(userId)).thenReturn(Optional.of(cart));
            when(cartItemRepository.existsByCartIdAndCourseId(cart.getId(), courseId)).thenReturn(false);
            // Simulate concurrent insert - DataIntegrityViolationException from unique constraint
            when(cartItemRepository.save(any(CartItem.class)))
                    .thenThrow(new org.springframework.dao.DataIntegrityViolationException(
                            "Duplicate entry for cart_id and course_id"));

            // When & Then
            assertThatThrownBy(() -> cartService.addToCart(userId, request))
                    .isInstanceOf(CourseAlreadyInCartException.class);
        }
    }

    @Nested
    @DisplayName("getOrCreateCart Race Condition Tests")
    class GetOrCreateCartRaceConditionTests {

        @Test
        @DisplayName("Should handle race condition when creating cart concurrently")
        void getCart_ConcurrentCartCreation_HandlesDataIntegrityViolation() {
            // Given - First findByUserId returns empty (cart doesn't exist yet)
            when(cartRepository.findByUserId(userId))
                    .thenReturn(Optional.empty())
                    // After catching DataIntegrityViolationException, second findByUserId succeeds
                    .thenReturn(Optional.of(cart));
            // Simulate concurrent cart creation - unique constraint violation
            when(cartRepository.save(any(Cart.class)))
                    .thenThrow(new org.springframework.dao.DataIntegrityViolationException(
                            "Duplicate entry for user_id"));
            when(cartItemRepository.findByCartId(cart.getId())).thenReturn(Collections.emptyList());

            // When
            CartResponse response = cartService.getCart(userId);

            // Then
            assertThat(response).isNotNull();
            // Should fetch existing cart after catching exception
            verify(cartRepository, times(2)).findByUserId(userId);
        }
    }

    @Nested
    @DisplayName("removeFromCart Tests")
    class RemoveFromCartTests {

        @Test
        @DisplayName("Should remove course from cart successfully and update cart timestamp")
        void removeFromCart_ExistingItem_RemovesItemAndUpdatesTimestamp() {
            // Given
            CartItem item = new CartItem();
            item.setId(1L);
            item.setCourseId(courseId);
            item.setCart(cart);

            LocalDateTime oldUpdatedAt = LocalDateTime.now().minusHours(1);
            cart.setUpdatedAt(oldUpdatedAt);

            when(cartRepository.findByUserId(userId)).thenReturn(Optional.of(cart));
            when(cartItemRepository.findByCartIdAndCourseId(cart.getId(), courseId)).thenReturn(Optional.of(item));
            when(cartRepository.save(any(Cart.class))).thenReturn(cart);
            when(cartRepository.findByIdWithItems(cart.getId())).thenReturn(Optional.of(cart));
            when(cartItemRepository.findByCartId(cart.getId())).thenReturn(Collections.emptyList());

            // When
            CartResponse response = cartService.removeFromCart(userId, courseId);

            // Then
            assertThat(response).isNotNull();
            verify(cartItemRepository).delete(item);
            // Verify cart's updatedAt timestamp was updated
            verify(cartRepository).save(argThat(c -> c.getUpdatedAt().isAfter(oldUpdatedAt)));
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
            CartItem item1 = new CartItem();
            item1.setId(1L);
            item1.setCourseId(100L);
            item1.setCart(cart);
            
            CartItem item2 = new CartItem();
            item2.setId(2L);
            item2.setCourseId(101L);
            item2.setCart(cart);
            
            CartItem item3 = new CartItem();
            item3.setId(3L);
            item3.setCourseId(102L);
            item3.setCart(cart);

            when(cartRepository.findByUserId(userId)).thenReturn(Optional.of(cart));
            when(cartItemRepository.findByCartId(cart.getId())).thenReturn(List.of(item1, item2, item3));
            when(cartRepository.save(any(Cart.class))).thenReturn(cart);

            // When
            cartService.removeItems(userId, List.of(100L, 101L));

            // Then
            verify(cartItemRepository).findByCartId(cart.getId());
            ArgumentCaptor<Iterable<CartItem>> captor = ArgumentCaptor.forClass(Iterable.class);
            verify(cartItemRepository).deleteAll(captor.capture());
            List<CartItem> deletedItems = (List<CartItem>) captor.getValue();
            assertThat(deletedItems).hasSize(2);
            assertThat(deletedItems).extracting(CartItem::getCourseId).containsExactlyInAnyOrder(100L, 101L);
            verify(cartRepository).save(any(Cart.class));
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
                    .status(CourseStatus.PUBLISHED)  // Need to set published status
                    .publishedAt(LocalDateTime.now())  // Need publishedAt for isPublished() to return true
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
                    .status(CourseStatus.PUBLISHED)  // Need to set published status
                    .publishedAt(LocalDateTime.now())  // Need publishedAt for isPublished() to return true
                    .build();
            ReflectionTestUtils.setField(course2, "id", courseId2);
            
            CartItem item2 = new CartItem();
            item2.setCourseId(courseId2);
            item2.setCart(cart);

            when(cartRepository.findByUserId(userId)).thenReturn(Optional.of(cart));
            when(cartItemRepository.findByCartId(cart.getId())).thenReturn(Arrays.asList(item1, item2));

            CourseInfo courseInfo1 = new CourseInfo(
                    course1.getId(),
                    course1.getTitle(),
                    course1.getSlug(),
                    course1.getThumbnailUrl(),
                    course1.getPrice(),
                    course1.getDiscountPrice(),
                    course1.getEffectivePrice(),
                    course1.getOriginalPrice(),
                    course1.isPublished(),
                    course1.getInstructorId(),
                    course1.getInstructorName(),
                    course1.getCurrency()
            );

            CourseInfo courseInfo2 = new CourseInfo(
                    course2.getId(),
                    course2.getTitle(),
                    course2.getSlug(),
                    course2.getThumbnailUrl(),
                    course2.getPrice(),
                    course2.getDiscountPrice(),
                    course2.getEffectivePrice(),
                    course2.getOriginalPrice(),
                    course2.isPublished(),
                    course2.getInstructorId(),
                    course2.getInstructorName(),
                    course2.getCurrency()
            );

            when(courseQueryService.getCourseInfoBatch(anyCollection()))
                    .thenReturn(java.util.Map.of(
                            courseId1, courseInfo1,
                            courseId2, courseInfo2
                    ));

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

    @Nested
    @DisplayName("Course Availability Tests")
    class CourseAvailabilityTests {

        @Test
        @DisplayName("Should mark unpublished courses as unavailable in cart response")
        void getCart_UnpublishedCourse_MarkedUnavailable() {
            // Given
            Long unpublishedCourseId = 102L;
            Course unpublishedCourse = Course.builder()
                    .title("Unpublished Course")
                    .slug("unpublished")
                    .price(new BigDecimal("50.00"))
                    .currency("USD")
                    .status(CourseStatus.DRAFT)  // Not published
                    .build();
            ReflectionTestUtils.setField(unpublishedCourse, "id", unpublishedCourseId);

            CartItem publishedItem = new CartItem();
            publishedItem.setId(1L);
            publishedItem.setCourseId(courseId);
            publishedItem.setCart(cart);

            CartItem unpublishedItem = new CartItem();
            unpublishedItem.setId(2L);
            unpublishedItem.setCourseId(unpublishedCourseId);
            unpublishedItem.setCart(cart);

            when(cartRepository.findByUserId(userId)).thenReturn(Optional.of(cart));
            when(cartItemRepository.findByCartId(cart.getId()))
                    .thenReturn(Arrays.asList(publishedItem, unpublishedItem));

            CourseInfo unpublishedCourseInfo = new CourseInfo(
                    unpublishedCourse.getId(),
                    unpublishedCourse.getTitle(),
                    unpublishedCourse.getSlug(),
                    unpublishedCourse.getThumbnailUrl(),
                    unpublishedCourse.getPrice(),
                    unpublishedCourse.getDiscountPrice(),
                    unpublishedCourse.getEffectivePrice(),
                    unpublishedCourse.getOriginalPrice(),
                    false,
                    unpublishedCourse.getInstructorId(),
                    unpublishedCourse.getInstructorName(),
                    unpublishedCourse.getCurrency()
            );

            when(courseQueryService.getCourseInfoBatch(anyCollection()))
                    .thenReturn(java.util.Map.of(
                            courseId, courseInfo,
                            unpublishedCourseId, unpublishedCourseInfo
                    ));

            // When
            CartResponse response = cartService.getCart(userId);

            // Then
            assertThat(response.getItems()).hasSize(2);

            // Verify published course is marked as available
            CartItemResponse publishedItemResp = response.getItems().stream()
                    .filter(item -> item.getCourseId().equals(courseId))
                    .findFirst().orElseThrow();
            assertThat(publishedItemResp.getIsAvailable()).isTrue();
            assertThat(publishedItemResp.getUnavailableReason()).isNull();

            // Verify unpublished course is marked as unavailable
            CartItemResponse unpublishedItemResp = response.getItems().stream()
                    .filter(item -> item.getCourseId().equals(unpublishedCourseId))
                    .findFirst().orElseThrow();
            assertThat(unpublishedItemResp.getIsAvailable()).isFalse();
            assertThat(unpublishedItemResp.getUnavailableReason()).contains("no longer published");

            // Only available items should be included in totals
            assertThat(response.getItemCount()).isEqualTo(1);  // Only published course counts
        }

        @Test
        @DisplayName("Should handle deleted/missing courses in cart response")
        void getCart_DeletedCourse_MarkedUnavailable() {
            // Given
            Long deletedCourseId = 999L;
            CartItem existingItem = new CartItem();
            existingItem.setId(1L);
            existingItem.setCourseId(courseId);
            existingItem.setCart(cart);

            CartItem deletedItem = new CartItem();
            deletedItem.setId(2L);
            deletedItem.setCourseId(deletedCourseId);
            deletedItem.setCart(cart);

            when(cartRepository.findByUserId(userId)).thenReturn(Optional.of(cart));
            when(cartItemRepository.findByCartId(cart.getId()))
                    .thenReturn(Arrays.asList(existingItem, deletedItem));
            // Course 999L is not returned (deleted)
            when(courseRepository.findAllById(anyCollection()))
                    .thenReturn(Collections.singletonList(course));

            // When
            CartResponse response = cartService.getCart(userId);

            // Then
            assertThat(response.getItems()).hasSize(2);

            // Verify deleted course is marked as unavailable
            CartItemResponse deletedItemResp = response.getItems().stream()
                    .filter(item -> item.getCourseId().equals(deletedCourseId))
                    .findFirst().orElseThrow();
            assertThat(deletedItemResp.getIsAvailable()).isFalse();
            assertThat(deletedItemResp.getUnavailableReason()).contains("has been removed");
            assertThat(deletedItemResp.getCourseTitle()).contains("no longer available");

            // Only available items in totals
            assertThat(response.getItemCount()).isEqualTo(1);
        }
    }
}
