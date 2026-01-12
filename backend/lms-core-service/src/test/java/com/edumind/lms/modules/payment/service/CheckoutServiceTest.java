package com.edumind.lms.modules.payment.service;

import com.edumind.lms.modules.course.entity.Course;
import com.edumind.lms.modules.course.enums.CourseStatus;
import com.edumind.lms.modules.course.repository.CourseRepository;
import com.edumind.lms.modules.course.repository.EnrollmentRepository;
import com.edumind.lms.modules.course.service.EnrollmentService;
import com.edumind.lms.modules.payment.dto.request.CheckoutRequest;
import com.edumind.lms.modules.payment.dto.request.DirectCheckoutRequest;
import com.edumind.lms.modules.payment.dto.response.CheckoutPreviewResponse;
import com.edumind.lms.modules.payment.dto.response.CheckoutResultResponse;
import com.edumind.lms.modules.payment.dto.response.InvoiceResponse;
import com.edumind.lms.modules.payment.entity.*;
import com.edumind.lms.modules.payment.enums.OrderStatus;
import com.edumind.lms.modules.payment.enums.PaymentMethod;
import com.edumind.lms.modules.payment.exception.CartEmptyException;
import com.edumind.lms.modules.payment.exception.CourseNotAvailableException;
import com.edumind.lms.modules.payment.gateway.GatewayPaymentResult;
import com.edumind.lms.modules.payment.gateway.GatewayResultStatus;
import com.edumind.lms.modules.payment.gateway.PaymentGateway;
import com.edumind.lms.modules.payment.gateway.config.PaymentGatewayRegistry;
import com.edumind.lms.modules.payment.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("CheckoutService Unit Tests")
class CheckoutServiceTest {

    @Mock
    private CartRepository cartRepository;

    @Mock
    private CartItemRepository cartItemRepository;

    @Mock
    private OrderRepository orderRepository;

    @Mock
    private OrderItemRepository orderItemRepository;

    @Mock
    private CourseRepository courseRepository;

    @Mock
    private EnrollmentRepository enrollmentRepository;

    @Mock
    private TransactionRepository transactionRepository;

    @Mock
    private CartService cartService;

    @Mock
    private OrderService orderService;

    @Mock
    private TransactionService transactionService;

    @Mock
    private EarningService earningService;

    @Mock
    private InvoiceService invoiceService;

    @Mock
    private EnrollmentService enrollmentService;

    @Mock
    private NumberGeneratorService numberGeneratorService;

    @Mock
    private PaymentGatewayRegistry gatewayRegistry;

    @Mock
    private PaymentGateway mockPaymentGateway;

    @Mock
    private ApplicationEventPublisher eventPublisher;

    @InjectMocks
    private CheckoutServiceImpl checkoutService;

    private Long userId = 1L;
    private Long courseId = 100L;
    private Cart cart;
    private CartItem cartItem;
    private Course course;
    private Order order;
    private OrderItem orderItem;

    @BeforeEach
    void setUp() {
        course = Course.builder()
                .title("Test Course")
                .slug("test-course")
                .thumbnailUrl("http://example.com/thumb.jpg")
                .instructorId(10L)
                .instructorName("Test Instructor")
                .price(new BigDecimal("100.00"))
                .discountPrice(new BigDecimal("80.00"))
                .currency("USD")
                .status(CourseStatus.PUBLISHED)
                .publishedAt(LocalDateTime.now())
                .build();
        ReflectionTestUtils.setField(course, "id", courseId);

        cart = new Cart();
        cart.setId(200L);
        cart.setUserId(userId);

        cartItem = new CartItem();
        cartItem.setId(300L);
        cartItem.setCart(cart);
        cartItem.setCourseId(courseId);

        order = new Order();
        order.setId(400L);
        order.setOrderNumber("ORD-2026-001");
        order.setUserId(userId);
        order.setStatus(OrderStatus.PENDING);
        order.setTotalAmount(new BigDecimal("80.00"));
        order.setCurrency("USD");
        order.setItems(new HashSet<>());
        
        orderItem = new OrderItem();
        orderItem.setId(900L);
        orderItem.setCourseId(courseId);
        orderItem.setFinalPrice(new BigDecimal("80.00"));
        order.getItems().add(orderItem);
    }

    @Nested
    @DisplayName("previewCheckout Tests")
    class PreviewCheckoutTests {

        @Test
        @DisplayName("Should return preview for valid cart")
        void previewCheckout_ValidCart_ReturnsPreview() {
            // Given
            when(cartRepository.findByUserId(userId)).thenReturn(Optional.of(cart));
            when(cartItemRepository.findByCartId(cart.getId())).thenReturn(List.of(cartItem));
            when(courseRepository.findAllById(anyList())).thenReturn(List.of(course));
            when(enrollmentRepository.findEnrolledCourseIds(userId, List.of(courseId))).thenReturn(Collections.emptyList());

            // When
            CheckoutPreviewResponse result = checkoutService.previewCheckout(userId);

            // Then
            assertThat(result).isNotNull();
            assertThat(result.getItems()).hasSize(1);
            assertThat(result.getTotalAmount()).isEqualByComparingTo("80.00");
        }

        @Test
        @DisplayName("Should throw exception if cart is empty")
        void previewCheckout_EmptyCart_ThrowsException() {
            // Given
            when(cartRepository.findByUserId(userId)).thenReturn(Optional.of(cart));
            when(cartItemRepository.findByCartId(cart.getId())).thenReturn(Collections.emptyList());

            // When & Then
            assertThatThrownBy(() -> checkoutService.previewCheckout(userId))
                    .isInstanceOf(CartEmptyException.class);
        }
    }

    @Nested
    @DisplayName("previewDirectCheckout Tests")
    class PreviewDirectCheckoutTests {

        @Test
        @DisplayName("Should return preview for valid course")
        void previewDirectCheckout_ValidCourse_ReturnsPreview() {
            // Given
            when(courseRepository.findById(courseId)).thenReturn(Optional.of(course));
            when(enrollmentRepository.existsByCourseIdAndStudentIdAndStatusNot(any(), any(), any())).thenReturn(false);

            // When
            CheckoutPreviewResponse result = checkoutService.previewDirectCheckout(userId, courseId);

            // Then
            assertThat(result).isNotNull();
            assertThat(result.getItems()).hasSize(1);
            assertThat(result.getTotalAmount()).isEqualByComparingTo("80.00");
        }

        @Test
        @DisplayName("Should throw exception if course not found")
        void previewDirectCheckout_CourseNotFound_ThrowsException() {
            // Given
            when(courseRepository.findById(courseId)).thenReturn(Optional.empty());

            // When & Then
            assertThatThrownBy(() -> checkoutService.previewDirectCheckout(userId, courseId))
                    .isInstanceOf(CourseNotAvailableException.class);
        }
    }

    @Nested
    @DisplayName("checkout Tests")
    class CheckoutTests {

        @Test
        @DisplayName("Should process successful checkout with payment")
        void checkout_WithPayment_CompletesSuccessfully() {
            // Given
            CheckoutRequest request = CheckoutRequest.builder()
                    .paymentMethod(PaymentMethod.PAYPAL)
                    .build();

            GatewayPaymentResult paymentResult = GatewayPaymentResult.builder()
                    .success(true)
                    .status(GatewayResultStatus.SUCCESS)
                    .gatewayTransactionId("paypal-txn-123")
                    .amount(new BigDecimal("80.00"))
                    .build();
            
            InvoiceResponse invoiceResponse = InvoiceResponse.builder().id(600L).invoiceNumber("INV-123").build();

            when(cartRepository.findByUserId(userId)).thenReturn(Optional.of(cart));
            when(cartItemRepository.findByCartId(cart.getId())).thenReturn(List.of(cartItem));
            when(orderService.createOrderFromCart(eq(userId), anyList(), any(CheckoutRequest.class))).thenReturn(order);
            // Mock gateway
            when(gatewayRegistry.getActiveGateway()).thenReturn(mockPaymentGateway);
            when(mockPaymentGateway.processPayment(any())).thenReturn(paymentResult);
            // Mock transaction (manual creation in service)
            when(numberGeneratorService.generateTransactionNumber()).thenReturn("TXN-2026-001");
            when(transactionRepository.save(any(Transaction.class))).thenAnswer(i -> i.getArguments()[0]);
            // Mock invoice service
            when(invoiceService.generateInvoice(any(Order.class))).thenReturn(invoiceResponse);
            when(invoiceService.getInvoiceById(anyLong())).thenReturn(invoiceResponse);

            // When
            CheckoutResultResponse result = checkoutService.checkout(userId, request);

            // Then
            assertThat(result).isNotNull();
            assertThat(result.isSuccess()).isTrue();
            assertThat(result.getTransactionNumber()).isEqualTo("TXN-2026-001");
            verify(cartService).clearCart(userId);
            verify(invoiceService).generateInvoice(any(Order.class));
            verify(earningService).createEarningsForOrder(any(Order.class));
        }

        @Test
        @DisplayName("Should process checkout for free course")
        void checkout_FreeCourse_CompletesImmediately() {
            // Given
            course = Course.builder()
                    .title("Free Course")
                    .slug("free-course")
                    .thumbnailUrl("http://example.com/thumb.jpg")
                    .instructorId(10L)
                    .instructorName("Test Instructor")
                    .price(BigDecimal.ZERO)
                    .discountPrice(BigDecimal.ZERO)
                    .currency("USD")
                    .status(CourseStatus.PUBLISHED)
                    .publishedAt(LocalDateTime.now())
                    .build();
            ReflectionTestUtils.setField(course, "id", courseId);

            CheckoutRequest request = CheckoutRequest.builder()
                    .paymentMethod(PaymentMethod.MOCK)
                    .build();
            
            InvoiceResponse invoiceResponse = InvoiceResponse.builder().id(600L).invoiceNumber("INV-123").build();

            when(cartRepository.findByUserId(userId)).thenReturn(Optional.of(cart));
            when(cartItemRepository.findByCartId(cart.getId())).thenReturn(List.of(cartItem));
            
            // Configure order mock to return total amount zero so business logic sees it as free
            Order freeOrder = new Order();
            freeOrder.setTotalAmount(BigDecimal.ZERO);
            // Need items for free order too for enrollments
            OrderItem orderItem = new OrderItem();
            orderItem.setCourseId(courseId);
            freeOrder.setItems(new HashSet<>(Collections.singletonList(orderItem)));
            
            when(orderService.createOrderFromCart(eq(userId), anyList(), any(CheckoutRequest.class))).thenReturn(freeOrder);
            when(orderRepository.save(any(Order.class))).thenReturn(freeOrder);
            when(invoiceService.generateInvoice(any(Order.class))).thenReturn(invoiceResponse);
            when(invoiceService.getInvoiceById(anyLong())).thenReturn(invoiceResponse);
            // Need to mock orderItemRepository because it is called to reload items
            when(orderItemRepository.findByOrderId(any())).thenReturn(Collections.emptyList());

            // When
            CheckoutResultResponse result = checkoutService.checkout(userId, request);

            // Then
            assertThat(result).isNotNull();
            verify(cartService).clearCart(userId);
            verify(invoiceService).generateInvoice(any(Order.class));
            // Verify no payment gateway call
            verifyNoInteractions(gatewayRegistry);
        }

        @Test
        @DisplayName("Should handle payment failure")
        void checkout_PaymentFailed_ReturnsFailure() {
            // Given
            CheckoutRequest request = CheckoutRequest.builder()
                    .paymentMethod(PaymentMethod.PAYPAL)
                    .build();

            GatewayPaymentResult paymentResult = GatewayPaymentResult.builder()
                    .success(false)
                    .status(GatewayResultStatus.FAILED)
                    .errorCode("CARD_DECLINED")
                    .errorMessage("Insufficient funds")
                    .build();

            when(cartRepository.findByUserId(userId)).thenReturn(Optional.of(cart));
            when(cartItemRepository.findByCartId(cart.getId())).thenReturn(List.of(cartItem));
            when(orderService.createOrderFromCart(eq(userId), anyList(), any(CheckoutRequest.class))).thenReturn(order);
            
            // Mock gateway
            when(gatewayRegistry.getActiveGateway()).thenReturn(mockPaymentGateway);
            when(mockPaymentGateway.processPayment(any())).thenReturn(paymentResult);
            // Mock transaction (manual creation)
            when(numberGeneratorService.generateTransactionNumber()).thenReturn("TXN-2026-001");
            when(transactionRepository.save(any(Transaction.class))).thenAnswer(i -> i.getArguments()[0]);

            // When
            CheckoutResultResponse result = checkoutService.checkout(userId, request);

            // Then
            assertThat(result.isSuccess()).isFalse();
            // Cart should NOT be cleared on failure
            verify(cartService, never()).clearCart(userId);
            // Invoice should NOT be generated
            verify(invoiceService, never()).generateInvoice(any(Order.class));
        }
    }

    @Nested
    @DisplayName("directCheckout Tests")
    class DirectCheckoutTests {

        @Test
        @DisplayName("Should process direct checkout successfully")
        void directCheckout_Success_CompletesOrder() {
            // Given
            DirectCheckoutRequest request = DirectCheckoutRequest.builder()
                    .courseId(courseId)
                    .paymentMethod(PaymentMethod.PAYPAL)
                    .build();

            GatewayPaymentResult paymentResult = GatewayPaymentResult.builder()
                    .success(true)
                    .status(GatewayResultStatus.SUCCESS)
                    .gatewayTransactionId("paypal-txn-123")
                    .amount(new BigDecimal("80.00"))
                    .build();
            
            InvoiceResponse invoiceResponse = InvoiceResponse.builder().id(600L).invoiceNumber("INV-123").build();

            when(courseRepository.findById(courseId)).thenReturn(Optional.of(course));
            when(enrollmentRepository.existsByCourseIdAndStudentIdAndStatusNot(any(), any(), any())).thenReturn(false);
            when(orderService.createOrderFromSingleCourse(eq(userId), any(Course.class), any(DirectCheckoutRequest.class))).thenReturn(order);
            
            // Mock gateway
            when(gatewayRegistry.getActiveGateway()).thenReturn(mockPaymentGateway);
            when(mockPaymentGateway.processPayment(any())).thenReturn(paymentResult);
            // Mock transaction
            when(numberGeneratorService.generateTransactionNumber()).thenReturn("TXN-2026-001");
            when(transactionRepository.save(any(Transaction.class))).thenAnswer(i -> i.getArguments()[0]);
            // Mock invoice
            when(invoiceService.generateInvoice(any(Order.class))).thenReturn(invoiceResponse);
            when(invoiceService.getInvoiceById(anyLong())).thenReturn(invoiceResponse);
            // Mock lazy loading of items
            when(orderItemRepository.findByOrderId(any())).thenReturn(List.of(orderItem));

            // When
            CheckoutResultResponse result = checkoutService.directCheckout(userId, request);

            // Then
            assertThat(result.isSuccess()).isTrue();
            verify(enrollmentService).enrollStudent(eq(courseId), eq(userId));
            verify(invoiceService).generateInvoice(any(Order.class));
        }

        @Test
        @DisplayName("Should throw exception if course unavailable")
        void directCheckout_CourseUnavailable_ThrowsException() {
            // Given
            DirectCheckoutRequest request = DirectCheckoutRequest.builder().courseId(courseId).build();
            when(courseRepository.findById(courseId)).thenReturn(Optional.of(course));
            // Simulate already enrolled
            when(enrollmentRepository.existsByCourseIdAndStudentIdAndStatusNot(any(), any(), any())).thenReturn(true);

            // When & Then
            assertThatThrownBy(() -> checkoutService.directCheckout(userId, request))
                    .isInstanceOf(com.edumind.lms.modules.payment.exception.CourseAlreadyPurchasedException.class);
        }
    }
}
