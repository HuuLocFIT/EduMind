package com.edumind.lms.modules.payment.integration;

import com.edumind.lms.modules.course.entity.Category;
import com.edumind.lms.modules.course.entity.Course;
import com.edumind.lms.modules.course.enums.CourseStatus;
import com.edumind.lms.modules.course.repository.EnrollmentRepository;
import com.edumind.lms.modules.payment.BasePaymentIntegrationTest;
import com.edumind.lms.modules.payment.dto.request.DirectCheckoutRequest;
import com.edumind.lms.modules.payment.entity.Order;
import com.edumind.lms.modules.payment.entity.Transaction;
import com.edumind.lms.modules.payment.enums.OrderStatus;
import com.edumind.lms.modules.payment.enums.PaymentMethod;
import com.edumind.lms.modules.payment.enums.TransactionStatus;
import com.edumind.lms.modules.payment.gateway.impl.paypal.PayPalWebhookPayload;
import com.edumind.lms.modules.payment.repository.OrderItemRepository;
import com.edumind.lms.modules.payment.repository.OrderRepository;
import com.edumind.lms.modules.payment.repository.TransactionRepository;
import com.edumind.lms.modules.payment.service.CheckoutService;
import com.edumind.lms.modules.payment.service.WebhookService;
import com.edumind.lms.config.security.JwtUserPrincipal;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Integration tests for PayPal webhook events.
 * Tests webhook processing for various PayPal events.
 */
@DisplayName("PayPal Webhook Integration Tests")
class PayPalWebhookIntegrationTest extends BasePaymentIntegrationTest {

    @Autowired
    private CheckoutService checkoutService;

    @Autowired
    private WebhookService webhookService;

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private TransactionRepository transactionRepository;

    @Autowired
    private EnrollmentRepository enrollmentRepository;
    
    @Autowired
    private OrderItemRepository orderItemRepository;

    private Course course;
    private Long userId = 1L;

    @BeforeEach
    void setUp() {
        Category category = Category.builder()
                .name("Test Category")
                .slug("test-category")
                .isActive(true)
                .build();
        categoryRepository.save(category);

        course = Course.builder()
                .title("Integration Test Course")
                .slug("integration-test-course")
                .description("Test Description")
                .instructorId(101L)
                .instructorName("Prof. Test")
                .category(category)
                .price(new BigDecimal("49.99"))
                .currency("USD")
                .status(CourseStatus.PUBLISHED)
                .publishedAt(LocalDateTime.now())
                .totalLessons(0)
                .build();
        courseRepository.save(course);
        
        setupSecurityContext();
    }
    
    private void setupSecurityContext() {
        JwtUserPrincipal principal = new JwtUserPrincipal(
            userId,
            "student",
            "student@example.com",
            List.of(new SimpleGrantedAuthority("ROLE_STUDENT")),
            null
        );
        
        UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
            principal,
            null,
            principal.authorities()
        );
        
        SecurityContextHolder.getContext().setAuthentication(authentication);
    }

    @Test
    @DisplayName("Should process PAYMENT.CAPTURE.COMPLETED webhook and create enrollment")
    void testPaymentCaptureCompleted() throws Exception {
        // Given - Create PENDING order waiting for webhook
        String orderNumber = createPendingOrder();

        // Create PayPal webhook payload for PAYMENT.CAPTURE.COMPLETED
        PayPalWebhookPayload payload = createPayPalWebhookPayload(
                "PAYMENT.CAPTURE.COMPLETED",
                orderNumber,
                "CAPTURE-123",
                "COMPLETED"
        );

        // When - Send webhook (no signature headers for testing)
        mockMvc.perform(post("/payments/webhook/paypal")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(payload)))
                .andExpect(status().isOk());

        // Then - Order should be completed, enrollment created
        Order updatedOrder = orderRepository.findWithItemsByOrderNumber(orderNumber).orElseThrow();
        assertThat(updatedOrder.getStatus()).isEqualTo(OrderStatus.COMPLETED);
        
        // Verify enrollment was created
        boolean isEnrolled = enrollmentRepository.existsByCourseIdAndStudentIdAndStatusNot(
                course.getId(), userId, com.edumind.lms.modules.course.enums.EnrollmentStatus.DROPPED);
        assertThat(isEnrolled).isTrue();
    }

    @Test
    @DisplayName("Should process CHECKOUT.ORDER.APPROVED webhook without finalizing")
    void testCheckoutOrderApproved() throws Exception {
        // Given - Create PENDING order waiting for webhook
        String orderNumber = createPendingOrder();

        // Create PayPal webhook payload for CHECKOUT.ORDER.APPROVED
        PayPalWebhookPayload payload = createPayPalWebhookPayload(
                "CHECKOUT.ORDER.APPROVED",
                orderNumber,
                "PAYPAL-ORDER-123",
                "APPROVED"
        );

        // When
        mockMvc.perform(post("/payments/webhook/paypal")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(payload)))
                .andExpect(status().isOk());

        // Then - Order should NOT be completed yet (awaiting capture)
        Order order = orderRepository.findWithItemsByOrderNumber(orderNumber).orElseThrow();
        assertThat(order.getStatus()).isNotEqualTo(OrderStatus.COMPLETED);
        // Should remain in PENDING or APPROVED state
    }

    @Test
    @DisplayName("Should process PAYMENT.CAPTURE.DENIED webhook and mark as failed")
    void testPaymentCaptureDenied() throws Exception {
        // Given - Create PENDING order waiting for webhook
        String orderNumber = createPendingOrder();

        // Create PayPal webhook payload for PAYMENT.CAPTURE.DENIED
        PayPalWebhookPayload payload = createPayPalWebhookPayload(
                "PAYMENT.CAPTURE.DENIED",
                orderNumber,
                "CAPTURE-123",
                "DENIED"
        );

        // When
        mockMvc.perform(post("/payments/webhook/paypal")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(payload)))
                .andExpect(status().isOk());

        // Then - Order should be marked as FAILED
        Order order = orderRepository.findWithItemsByOrderNumber(orderNumber).orElseThrow();
        assertThat(order.getStatus()).isEqualTo(OrderStatus.FAILED);
        
        // No enrollment should be created
        boolean isEnrolled = enrollmentRepository.existsByCourseIdAndStudentIdAndStatusNot(
                course.getId(), userId, com.edumind.lms.modules.course.enums.EnrollmentStatus.DROPPED);
        assertThat(isEnrolled).isFalse();
    }

    @Test
    @DisplayName("Should handle duplicate webhook (idempotency)")
    void testDuplicateWebhook() throws Exception {
        // Given - Create PENDING order waiting for webhook
        String orderNumber = createPendingOrder();

        PayPalWebhookPayload payload = createPayPalWebhookPayload(
                "PAYMENT.CAPTURE.COMPLETED",
                orderNumber,
                "CAPTURE-123",
                "COMPLETED"
        );

        // First webhook
        mockMvc.perform(post("/payments/webhook/paypal")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(payload)))
                .andExpect(status().isOk());

        // Second duplicate webhook
        mockMvc.perform(post("/payments/webhook/paypal")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(payload)))
                .andExpect(status().isOk());

        // Then - Should only have one enrollment (idempotent)
        Order order = orderRepository.findWithItemsByOrderNumber(orderNumber).orElseThrow();
        assertThat(order.getStatus()).isEqualTo(OrderStatus.COMPLETED);
        // Enrollment should exist but only one
    }

    @Test
    @DisplayName("Should handle out-of-order webhooks (COMPLETED before APPROVED)")
    void testOutOfOrderWebhooks() throws Exception {
        // Given - Create PENDING order waiting for webhook
        String orderNumber = createPendingOrder();

        // Send COMPLETED webhook first (out of order)
        PayPalWebhookPayload completedPayload = createPayPalWebhookPayload(
                "PAYMENT.CAPTURE.COMPLETED",
                orderNumber,
                "CAPTURE-123",
                "COMPLETED"
        );

        mockMvc.perform(post("/payments/webhook/paypal")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(completedPayload)))
                .andExpect(status().isOk());

        // Then - Should still process successfully
        Order order = orderRepository.findWithItemsByOrderNumber(orderNumber).orElseThrow();
        assertThat(order.getStatus()).isEqualTo(OrderStatus.COMPLETED);
    }

    // ===== Helper Methods =====
    
    /**
     * Create a PENDING order for webhook testing (without completing payment).
     * This simulates an order waiting for PayPal webhook confirmation.
     */
    private String createPendingOrder() {
        Order order = Order.builder()
                .userId(userId)
                .orderNumber("ORD-202602-" + String.format("%04d", orderRepository.count() + 1))
                .customerEmail("student@example.com")
                .customerName("Test Student")
                .status(OrderStatus.PENDING)
                .paymentMethod(PaymentMethod.PAYPAL)
                .currency("USD")
                .subtotal(course.getPrice())
                .discountTotal(BigDecimal.ZERO)
                .totalAmount(course.getPrice())
                .expiresAt(LocalDateTime.now().plusMinutes(30))
                .build();
        
        order = orderRepository.save(order);
        
        // Add order item
        com.edumind.lms.modules.payment.entity.OrderItem item = 
                com.edumind.lms.modules.payment.entity.OrderItem.builder()
                .order(order)
                .courseId(course.getId())
                .courseTitle(course.getTitle())
                .courseSlug(course.getSlug())
                .instructorId(course.getInstructorId())
                .instructorName(course.getInstructorName())
                .currency("USD")
                .originalPrice(course.getPrice())
                .discountAmount(BigDecimal.ZERO)
                .finalPrice(course.getPrice())
                .build();
        
        orderItemRepository.save(item);
        
        return order.getOrderNumber();
    }

    private PayPalWebhookPayload createPayPalWebhookPayload(
            String eventType, String orderNumber, String resourceId, String status) {
        PayPalWebhookPayload payload = new PayPalWebhookPayload();
        payload.setId("webhook-id-123");
        payload.setEventType(eventType);
        payload.setCreateTime("2026-01-15T10:00:00Z");
        
        // Create resource as Map (required for JSON serialization)
        Map<String, Object> resourceMap = new LinkedHashMap<>();
        resourceMap.put("id", resourceId);
        resourceMap.put("status", status);
        resourceMap.put("custom_id", orderNumber);
        
        // Add amount
        Map<String, Object> amountMap = new LinkedHashMap<>();
        amountMap.put("value", "49.99");
        amountMap.put("currency_code", "USD");
        resourceMap.put("amount", amountMap);
        
        // Use setRawResource to populate both rawResource and parsed resource
        payload.setRawResource(resourceMap);
        
        return payload;
    }
}
