package com.edumind.lms.modules.payment.service;

import com.edumind.lms.modules.course.entity.Course;
import com.edumind.lms.modules.course.enums.CourseStatus;
import com.edumind.lms.modules.course.repository.CourseRepository;
import com.edumind.lms.modules.course.repository.EnrollmentRepository;
import com.edumind.lms.modules.payment.dto.request.CheckoutRequest;
import com.edumind.lms.modules.payment.dto.request.DirectCheckoutRequest;
import com.edumind.lms.modules.payment.dto.response.OrderCountResponse;
import com.edumind.lms.modules.payment.dto.response.OrderResponse;
import com.edumind.lms.modules.payment.dto.response.OrderSummaryResponse;
import com.edumind.lms.modules.payment.entity.CartItem;
import com.edumind.lms.modules.payment.entity.Order;
import com.edumind.lms.modules.payment.entity.OrderItem;
import com.edumind.lms.modules.payment.enums.OrderStatus;
import com.edumind.lms.modules.payment.enums.PaymentMethod;
import com.edumind.lms.modules.payment.exception.CartEmptyException;
import com.edumind.lms.modules.payment.exception.InvalidOrderStateException;
import com.edumind.lms.modules.payment.exception.OrderNotFoundException;
import com.edumind.lms.modules.payment.repository.OrderItemRepository;
import com.edumind.lms.modules.payment.repository.OrderRepository;
import com.edumind.common.response.ApiResponse;
import com.edumind.lms.shared.client.UserClient;
import com.edumind.lms.shared.dto.UserResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("OrderService Unit Tests")
class OrderServiceTest {

    @Mock
    private OrderRepository orderRepository;

    @Mock
    private OrderItemRepository orderItemRepository;

    @Mock
    private NumberGeneratorService numberGeneratorService;

    @Mock
    private CourseRepository courseRepository;

    @Mock
    private EnrollmentRepository enrollmentRepository;

    @Mock
    private UserClient userClient;

    @InjectMocks
    private OrderServiceImpl orderService;

    private Long userId = 1L;
    private Long orderId = 100L;
    private String orderNumber = "ORD-2026-001";
    private Order order;
    private Course course;

    @BeforeEach
    void setUp() {
        order = new Order();
        order.setId(orderId);
        order.setOrderNumber(orderNumber);
        order.setUserId(userId);
        order.setStatus(OrderStatus.PENDING);
        order.setSubtotal(new BigDecimal("100.00"));
        order.setDiscountTotal(BigDecimal.ZERO);
        order.setTotalAmount(new BigDecimal("100.00"));
        order.setCurrency("USD");
        order.setCreatedAt(LocalDateTime.now());
        order.setUpdatedAt(LocalDateTime.now());
        order.setItems(new HashSet<>());

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
        org.springframework.test.util.ReflectionTestUtils.setField(course, "id", 200L);
    }

    @Nested
    @DisplayName("getOrderByIdAndUser Tests")
    class GetOrderByIdAndUserTests {

        @Test
        @DisplayName("Should return order for valid user")
        void getOrderByIdAndUser_ValidUser_ReturnsOrder() {
            // Given
            when(orderRepository.findWithItemsById(orderId)).thenReturn(Optional.of(order));

            // When
            OrderResponse response = orderService.getOrderByIdAndUser(orderId, userId);

            // Then
            assertThat(response).isNotNull();
            assertThat(response.getOrderNumber()).isEqualTo(orderNumber);
        }

        @Test
        @DisplayName("Should throw exception if order not found")
        void getOrderByIdAndUser_OrderNotFound_ThrowsException() {
            // Given
            when(orderRepository.findWithItemsById(orderId)).thenReturn(Optional.empty());

            // When & Then
            assertThatThrownBy(() -> orderService.getOrderByIdAndUser(orderId, userId))
                    .isInstanceOf(OrderNotFoundException.class);
        }

        @Test
        @DisplayName("Should throw exception if user does not own order")
        void getOrderByIdAndUser_WrongUser_ThrowsException() {
            // Given
            order.setUserId(999L); // Different user
            when(orderRepository.findWithItemsById(orderId)).thenReturn(Optional.of(order));

            // When & Then
            assertThatThrownBy(() -> orderService.getOrderByIdAndUser(orderId, userId))
                    .isInstanceOf(OrderNotFoundException.class);
        }
    }

    @Nested
    @DisplayName("getOrderByNumberAndUser Tests")
    class GetOrderByNumberAndUserTests {

        @Test
        @DisplayName("Should return order by order number")
        void getOrderByNumberAndUser_ValidNumber_ReturnsOrder() {
            // Given
            when(orderRepository.findWithItemsByOrderNumber(orderNumber)).thenReturn(Optional.of(order));

            // When
            OrderResponse response = orderService.getOrderByNumberAndUser(orderNumber, userId);

            // Then
            assertThat(response).isNotNull();
            assertThat(response.getOrderNumber()).isEqualTo(orderNumber);
        }
    }

    @Nested
    @DisplayName("getOrdersByUser Tests")
    class GetOrdersByUserTests {

        @Test
        @DisplayName("Should return paginated orders")
        void getOrdersByUser_ReturnsPage() {
            // Given
            Pageable pageable = PageRequest.of(0, 10);
            Page<Order> orderPage = new PageImpl<>(List.of(order));
            
            when(orderRepository.findByUserIdOrderByCreatedAtDesc(userId, pageable)).thenReturn(orderPage);
            List<Object[]> itemCounts = new ArrayList<>();
            itemCounts.add(new Object[]{orderId, 1L});
            when(orderItemRepository.countItemsByOrderIds(any())).thenReturn(itemCounts);

            // When
            Page<OrderSummaryResponse> result = orderService.getOrdersByUser(userId, pageable);

            // Then
            assertThat(result.getContent()).hasSize(1);
        }
    }

    @Nested
    @DisplayName("updateOrderStatus Tests")
    class UpdateOrderStatusTests {

        @Test
        @DisplayName("Should update order status")
        void updateOrderStatus_ValidOrder_UpdatesStatus() {
            // Given
            when(orderRepository.findById(orderId)).thenReturn(Optional.of(order));
            when(orderRepository.save(any(Order.class))).thenReturn(order);

            // When
            orderService.updateOrderStatus(orderId, OrderStatus.PROCESSING);

            // Then
            verify(orderRepository).save(order);
            assertThat(order.getStatus()).isEqualTo(OrderStatus.PROCESSING);
        }
    }

    @Nested
    @DisplayName("completeOrder Tests")
    class CompleteOrderTests {

        @Test
        @DisplayName("Should complete pending order")
        void completeOrder_PendingOrder_Completes() {
            // Given
            order.setStatus(OrderStatus.PENDING);
            when(orderRepository.findById(orderId)).thenReturn(Optional.of(order));
            when(orderRepository.save(any(Order.class))).thenReturn(order);

            // When
            orderService.completeOrder(orderId);

            // Then
            assertThat(order.getStatus()).isEqualTo(OrderStatus.COMPLETED);
            assertThat(order.getCompletedAt()).isNotNull();
        }

        @Test
        @DisplayName("Should complete processing order")
        void completeOrder_ProcessingOrder_Completes() {
            // Given
            order.setStatus(OrderStatus.PROCESSING);
            when(orderRepository.findById(orderId)).thenReturn(Optional.of(order));
            when(orderRepository.save(any(Order.class))).thenReturn(order);

            // When
            orderService.completeOrder(orderId);

            // Then
            assertThat(order.getStatus()).isEqualTo(OrderStatus.COMPLETED);
            assertThat(order.getCompletedAt()).isNotNull();
        }

        @Test
        @DisplayName("Should throw exception for non-pending order")
        void completeOrder_CompletedOrder_ThrowsException() {
            // Given
            order.setStatus(OrderStatus.COMPLETED);
            when(orderRepository.findById(orderId)).thenReturn(Optional.of(order));

            // When & Then
            assertThatThrownBy(() -> orderService.completeOrder(orderId))
                    .isInstanceOf(InvalidOrderStateException.class);
        }
    }

    @Nested
    @DisplayName("failOrder Tests")
    class FailOrderTests {

        @Test
        @DisplayName("Should fail order with reason")
        void failOrder_SetsFailureReason() {
            // Given
            when(orderRepository.findById(orderId)).thenReturn(Optional.of(order));
            when(orderRepository.save(any(Order.class))).thenReturn(order);

            // When
            orderService.failOrder(orderId, "Payment declined");

            // Then
            assertThat(order.getStatus()).isEqualTo(OrderStatus.FAILED);
            assertThat(order.getFailureReason()).isEqualTo("Payment declined");
        }
    }

    @Nested
    @DisplayName("cancelOrder Tests")
    class CancelOrderTests {

        @Test
        @DisplayName("Should cancel pending order")
        void cancelOrder_PendingOrder_Cancels() {
            // Given
            order.setStatus(OrderStatus.PENDING);
            when(orderRepository.findWithItemsById(orderId)).thenReturn(Optional.of(order));
            when(orderRepository.save(any(Order.class))).thenReturn(order);

            // When
            OrderResponse response = orderService.cancelOrder(orderId, userId);

            // Then
            assertThat(order.getStatus()).isEqualTo(OrderStatus.CANCELLED);
        }

        @Test
        @DisplayName("Should throw exception for non-pending order")
        void cancelOrder_CompletedOrder_ThrowsException() {
            // Given
            order.setStatus(OrderStatus.COMPLETED);
            when(orderRepository.findWithItemsById(orderId)).thenReturn(Optional.of(order));

            // When & Then
            assertThatThrownBy(() -> orderService.cancelOrder(orderId, userId))
                    .isInstanceOf(InvalidOrderStateException.class);
        }
    }

    @Nested
    @DisplayName("requestRefund Tests")
    class RequestRefundTests {

        @Test
        @DisplayName("Should request refund for completed order")
        void requestRefund_CompletedOrder_RequestsRefund() {
            // Given
            order.setStatus(OrderStatus.COMPLETED);
            when(orderRepository.findWithItemsById(orderId)).thenReturn(Optional.of(order));
            when(orderRepository.save(any(Order.class))).thenReturn(order);

            // When
            orderService.requestRefund(orderId, userId, "Not satisfied");

            // Then
            assertThat(order.getStatus()).isEqualTo(OrderStatus.REFUNDED);
        }

        @Test
        @DisplayName("Should throw exception for non-completed order")
        void requestRefund_PendingOrder_ThrowsException() {
            // Given
            order.setStatus(OrderStatus.PENDING);
            when(orderRepository.findWithItemsById(orderId)).thenReturn(Optional.of(order));

            // When & Then
            assertThatThrownBy(() -> orderService.requestRefund(orderId, userId, "Reason"))
                    .isInstanceOf(InvalidOrderStateException.class);
        }
    }

    @Nested
    @DisplayName("getOrderCountsByUser Tests")
    class GetOrderCountsByUserTests {

        @Test
        @DisplayName("Should return order counts by status")
        void getOrderCountsByUser_ReturnsCorrectCounts() {
            // Given
            when(orderRepository.countByUserId(userId)).thenReturn(5L);
            List<Object[]> statusList = new ArrayList<>();
            statusList.add(new Object[]{OrderStatus.COMPLETED, 3L});
            statusList.add(new Object[]{OrderStatus.PENDING, 2L});
            when(orderRepository.countStatusByUserId(userId)).thenReturn(statusList);

            // When
            OrderCountResponse response = orderService.getOrderCountsByUser(userId);

            // Then
            assertThat(response.getTotal()).isEqualTo(5);
            assertThat(response.getCompleted()).isEqualTo(3);
            assertThat(response.getPending()).isEqualTo(2);
        }
    }

    @Nested
    @DisplayName("createOrderFromCart Tests")
    class CreateOrderFromCartTests {

        @Test
        @DisplayName("Should create order from cart items")
        void createOrderFromCart_ValidItems_CreatesOrder() {
            // Given
            CartItem cartItem = new CartItem();
            cartItem.setCourseId(course.getId());
            cartItem.setPriceSnapshot(course.getPrice());

            CheckoutRequest request = new CheckoutRequest();
            request.setPaymentMethod(PaymentMethod.MOCK);
            request.setCustomerName("Test User");
            request.setCustomerEmail("test@example.com");

            when(numberGeneratorService.generateOrderNumber()).thenReturn(orderNumber);
            when(orderRepository.save(any(Order.class))).thenAnswer(inv -> {
                Order o = inv.getArgument(0);
                o.setId(orderId);
                return o;
            });
            when(courseRepository.findAllById(any())).thenReturn(List.of(course));
            when(enrollmentRepository.findEnrolledCourseIds(userId, List.of(course.getId()))).thenReturn(Collections.emptyList());
            when(orderItemRepository.save(any(OrderItem.class))).thenAnswer(inv -> inv.getArgument(0));

            // When
            Order result = orderService.createOrderFromCart(userId, List.of(cartItem), request);

            // Then
            assertThat(result).isNotNull();
            assertThat(result.getOrderNumber()).isEqualTo(orderNumber);
            verify(orderItemRepository).save(any(OrderItem.class));
        }

        @Test
        @DisplayName("Should skip unpublished courses")
        void createOrderFromCart_SkipUnpublished_CreatesOrderWithValidItemsOnly() {
            // Given
            Course unpublishedCourse = Course.builder()
                    .title("Unpublished Course")
                    .price(new BigDecimal("50.00"))
                    .status(CourseStatus.DRAFT)
                    .build();
            ReflectionTestUtils.setField(unpublishedCourse, "id", 201L);

            CartItem validItem = new CartItem();
            validItem.setCourseId(course.getId());
            validItem.setPriceSnapshot(course.getPrice());

            CartItem invalidItem = new CartItem();
            invalidItem.setCourseId(unpublishedCourse.getId());
            invalidItem.setPriceSnapshot(unpublishedCourse.getPrice());

            CheckoutRequest request = new CheckoutRequest();
            request.setPaymentMethod(PaymentMethod.MOCK);
            request.setCustomerName("Test User");
            request.setCustomerEmail("test@example.com");

            when(numberGeneratorService.generateOrderNumber()).thenReturn(orderNumber);
            when(orderRepository.save(any(Order.class))).thenAnswer(inv -> inv.getArgument(0));
            
            // Mock finding both courses
            when(courseRepository.findAllById(any())).thenReturn(List.of(course, unpublishedCourse));
            // Mock no existing enrollments
            when(enrollmentRepository.findEnrolledCourseIds(any(), any())).thenReturn(Collections.emptyList());
            when(orderItemRepository.save(any(OrderItem.class))).thenAnswer(inv -> inv.getArgument(0));

            // When
            Order result = orderService.createOrderFromCart(userId, List.of(validItem, invalidItem), request);

            // Then
            // Started with 2 items, but unpublished one should be skipped. 
            // verifying validation was done is indirect via the number of saved items or result total
            verify(orderItemRepository, times(1)).save(any(OrderItem.class)); 
            assertThat(result.getTotalAmount()).isEqualTo(course.getEffectivePrice());
        }

        @Test
        @DisplayName("Should skip already enrolled courses")
        void createOrderFromCart_SkipEnrolled_CreatesOrderWithValidItemsOnly() {
            // Given
            Course enrolledCourse = Course.builder()
                    .title("Enrolled Course")
                    .price(new BigDecimal("50.00"))
                    .status(CourseStatus.PUBLISHED)
                    .build();
            org.springframework.test.util.ReflectionTestUtils.setField(enrolledCourse, "id", 201L);

            CartItem validItem = new CartItem();
            validItem.setCourseId(course.getId());

            CartItem enrolledItem = new CartItem();
            enrolledItem.setCourseId(enrolledCourse.getId());

            CheckoutRequest request = new CheckoutRequest();
            request.setPaymentMethod(PaymentMethod.MOCK);
            request.setCustomerName("Test User");
            request.setCustomerEmail("test@example.com");

            when(numberGeneratorService.generateOrderNumber()).thenReturn(orderNumber);
            when(orderRepository.save(any(Order.class))).thenAnswer(inv -> inv.getArgument(0));
            when(courseRepository.findAllById(any())).thenReturn(List.of(course, enrolledCourse));
            
            // Mock enrollment for the second course
            when(enrollmentRepository.findEnrolledCourseIds(eq(userId), any()))
                    .thenReturn(List.of(enrolledCourse.getId()));
            
            when(orderItemRepository.save(any(OrderItem.class))).thenAnswer(inv -> inv.getArgument(0));

            // When
            Order result = orderService.createOrderFromCart(userId, List.of(validItem, enrolledItem), request);

            // Then
            verify(orderItemRepository, times(1)).save(any(OrderItem.class));
        }

        @Test
        @DisplayName("Should throw exception if all items are skipped")
        void createOrderFromCart_AllItemsSkipped_ThrowsException() {
            // Given
            CartItem item = new CartItem();
            item.setCourseId(course.getId());
            CheckoutRequest request = new CheckoutRequest();
            request.setPaymentMethod(PaymentMethod.MOCK);

            when(numberGeneratorService.generateOrderNumber()).thenReturn(orderNumber);
            when(orderRepository.save(any(Order.class))).thenAnswer(inv -> inv.getArgument(0));
            when(courseRepository.findAllById(any())).thenReturn(List.of(course));
            
            // Simulating already enrolled
            when(enrollmentRepository.findEnrolledCourseIds(any(), any())).thenReturn(List.of(course.getId()));

            // When & Then
            assertThatThrownBy(() -> orderService.createOrderFromCart(userId, List.of(item), request))
                    .isInstanceOf(CartEmptyException.class)
                    .hasMessageContaining("No valid items");
        }

        @Test
        @DisplayName("Should fetch customer details if missing")
        void createOrderFromCart_MissingCustomerDetails_FetchesFromUserClient() {
            // Given
            CartItem cartItem = new CartItem();
            cartItem.setCourseId(course.getId());
            
            CheckoutRequest request = new CheckoutRequest();
            request.setPaymentMethod(PaymentMethod.MOCK);
            // Missing name/email in request

            UserResponse userResponse = new UserResponse();
            userResponse.setEmail("fetched@example.com");
            userResponse.setFirstName("Fetched");
            userResponse.setLastName("User");
            ApiResponse<UserResponse> apiResponse = ApiResponse.success(userResponse);

            when(numberGeneratorService.generateOrderNumber()).thenReturn(orderNumber);
            when(orderRepository.save(any(Order.class))).thenAnswer(inv -> inv.getArgument(0));
            when(courseRepository.findAllById(any())).thenReturn(List.of(course));
            when(enrollmentRepository.findEnrolledCourseIds(any(), any())).thenReturn(Collections.emptyList());
            when(userClient.getCurrentUser()).thenReturn(apiResponse);

            // When
            Order result = orderService.createOrderFromCart(userId, List.of(cartItem), request);

            // Then
            assertThat(result.getCustomerName()).isEqualTo("Fetched User");
            assertThat(result.getCustomerEmail()).isEqualTo("fetched@example.com");
        }

        @Test
        @DisplayName("Should use fallback if fetching customer details fails")
        void createOrderFromCart_FetchDetailsFails_UsesFallback() {
            // Given
            CartItem cartItem = new CartItem();
            cartItem.setCourseId(course.getId());
            CheckoutRequest request = new CheckoutRequest();
            request.setPaymentMethod(PaymentMethod.MOCK);

            when(numberGeneratorService.generateOrderNumber()).thenReturn(orderNumber);
            when(orderRepository.save(any(Order.class))).thenAnswer(inv -> inv.getArgument(0));
            when(courseRepository.findAllById(any())).thenReturn(List.of(course));
            when(enrollmentRepository.findEnrolledCourseIds(any(), any())).thenReturn(Collections.emptyList());
            
            // Simulate error
            when(userClient.getCurrentUser()).thenThrow(new RuntimeException("Service down"));

            // When
            Order result = orderService.createOrderFromCart(userId, List.of(cartItem), request);

            // Then
            assertThat(result.getCustomerName()).isEqualTo("Unknown User");
            assertThat(result.getCustomerEmail()).isEqualTo("unknown@edumind.com");
        }

        @Test
        @DisplayName("Should calculate totals correctly")
        void createOrderFromCart_CalculatesCorrectTotals() {
            // Given
            course.setPrice(new BigDecimal("100.00")); // Original
            // Effective price is usually calculated in entity or service, 
            // but here we mocked course. Assuming getEffectivePrice() returns price if not set,
            // or we manually set it if setter exists. If not, we rely on behavior.
            // Let's create a course with specific prices using the builder which sets fields directly.
            Course pricedCourse = Course.builder()
                    .title("Priced Course")
                    .price(new BigDecimal("100.00")) // Original Price
                    .status(CourseStatus.PUBLISHED)
                    .publishedAt(LocalDateTime.now())
                    // If Course entity has salePrice logic, we'd set it. 
                    // Assuming for test purposes standard price.
                    .build();
            ReflectionTestUtils.setField(pricedCourse, "id", 300L);
            // Let's mock effective price explicitly if it's a method
            // or set it via field if it's a field.
            // Looking at Course entity usage in setup, it's just data. 
            // In OrderServiceImpl, it calls course.getEffectivePrice(). 
            // If getEffectivePrice logic exists in Course entity, we trust it. 
            // Tests showed course.price used. Let's assume effectivePrice == price for this test,
            // or we can spy on the course object if needed, but simpler is better.
            
            CartItem cartItem = new CartItem();
            cartItem.setCourseId(pricedCourse.getId());
            
            CheckoutRequest request = new CheckoutRequest();
            request.setPaymentMethod(PaymentMethod.MOCK);
            request.setCustomerName("Test");
            request.setCustomerEmail("test@example.com");

            when(numberGeneratorService.generateOrderNumber()).thenReturn(orderNumber);
            when(orderRepository.save(any(Order.class))).thenAnswer(inv -> inv.getArgument(0));
            when(courseRepository.findAllById(any())).thenReturn(List.of(pricedCourse));
            when(enrollmentRepository.findEnrolledCourseIds(any(), any())).thenReturn(Collections.emptyList());

            // When
            Order result = orderService.createOrderFromCart(userId, List.of(cartItem), request);

            // Then
            assertThat(result.getSubtotal()).isEqualByComparingTo(new BigDecimal("100.00"));
            // Assuming no discount
            assertThat(result.getDiscountTotal()).isEqualByComparingTo(BigDecimal.ZERO);
            assertThat(result.getTotalAmount()).isEqualByComparingTo(new BigDecimal("100.00"));
        }

        @Test
        @DisplayName("Should throw exception for empty cart")
        void createOrderFromCart_EmptyCart_ThrowsException() {
            // Given
            CheckoutRequest request = new CheckoutRequest();
            request.setPaymentMethod(PaymentMethod.MOCK);

            when(numberGeneratorService.generateOrderNumber()).thenReturn(orderNumber);
            when(orderRepository.save(any(Order.class))).thenAnswer(inv -> {
                Order o = inv.getArgument(0);
                o.setId(orderId);
                return o;
            });

            // When & Then
            assertThatThrownBy(() -> orderService.createOrderFromCart(userId, Collections.emptyList(), request))
                    .isInstanceOf(CartEmptyException.class);
        }
    }

    @Nested
    @DisplayName("createOrderFromSingleCourse Tests")
    class CreateOrderFromSingleCourseTests {

        @Test
        @DisplayName("Should create order from single course")
        void createOrderFromSingleCourse_ValidCourse_CreatesOrder() {
            // Given
            DirectCheckoutRequest request = new DirectCheckoutRequest();
            request.setCourseId(course.getId());
            request.setPaymentMethod(PaymentMethod.MOCK);
            request.setCustomerName("Test User");
            request.setCustomerEmail("test@example.com");

            when(numberGeneratorService.generateOrderNumber()).thenReturn(orderNumber);
            when(orderRepository.save(any(Order.class))).thenAnswer(inv -> {
                Order o = inv.getArgument(0);
                o.setId(orderId);
                return o;
            });
            when(orderItemRepository.save(any(OrderItem.class))).thenAnswer(inv -> inv.getArgument(0));

            // When
            Order result = orderService.createOrderFromSingleCourse(userId, course, request);

            // Then
            assertThat(result).isNotNull();
            assertThat(result.getOrderNumber()).isEqualTo(orderNumber);
            verify(orderItemRepository).save(any(OrderItem.class));
        }

        @Test
        @DisplayName("Should handle null prices gracefully")
        void createOrderFromSingleCourse_NullPrices_HandledGracefully() {
            // Given
            Course nullPriceCourse = Course.builder()
                    .title("Free Course")
                    .price(null) // Null original price
                    .build();
            ReflectionTestUtils.setField(nullPriceCourse, "id", 400L);

            DirectCheckoutRequest request = new DirectCheckoutRequest();
            request.setCourseId(nullPriceCourse.getId());
            request.setPaymentMethod(PaymentMethod.MOCK);
            request.setCustomerName("Test");
            request.setCustomerEmail("test@example.com");

            when(numberGeneratorService.generateOrderNumber()).thenReturn(orderNumber);
            when(orderRepository.save(any(Order.class))).thenAnswer(inv -> inv.getArgument(0));
            // Note: service uses course passed in argument, doesn't fetch from repo

            // When
            Order result = orderService.createOrderFromSingleCourse(userId, nullPriceCourse, request);

            // Then
            assertThat(result.getSubtotal()).isEqualByComparingTo(BigDecimal.ZERO);
            assertThat(result.getTotalAmount()).isEqualByComparingTo(BigDecimal.ZERO);
        }
    }
}
