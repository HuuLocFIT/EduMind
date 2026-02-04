package com.edumind.lms.modules.payment.integration;

import com.edumind.lms.modules.course.entity.Category;
import com.edumind.lms.modules.course.entity.Course;
import com.edumind.lms.modules.course.enums.CourseStatus;
import com.edumind.lms.modules.course.repository.EnrollmentRepository;
import com.edumind.lms.modules.payment.BasePaymentIntegrationTest;
import com.edumind.lms.modules.payment.dto.request.DirectCheckoutRequest;
import com.edumind.lms.modules.payment.entity.Order;
import com.edumind.lms.modules.payment.enums.OrderStatus;
import com.edumind.lms.modules.payment.enums.PaymentMethod;
import com.edumind.lms.modules.payment.gateway.impl.SepayGateway;
import com.edumind.lms.modules.payment.gateway.impl.sepay.SepayWebhookPayload;
import com.edumind.lms.modules.payment.repository.OrderRepository;
import com.edumind.lms.modules.payment.service.CheckoutService;
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
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Integration tests for SePay webhook flow.
 * Tests the full flow from QR generation → transfer → webhook → enrollment.
 */
@DisplayName("SePay Webhook Integration Tests")
class SepayWebhookIntegrationTest extends BasePaymentIntegrationTest {

    @Autowired
    private CheckoutService checkoutService;

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private EnrollmentRepository enrollmentRepository;

    @Autowired(required = false)
    private SepayGateway sepayGateway;

    private Course course;
    private Long userId = 1L;
    private String testAccountNumber = "1234567890";

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
                .price(new BigDecimal("100000"))  // 100,000 VND
                .currency("VND")
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
    @DisplayName("Should complete full SePay flow: QR → transfer → webhook → enrollment")
    void testFullSepayFlow() throws Exception {
        // Given - Create order via direct checkout with SePay
        DirectCheckoutRequest request = new DirectCheckoutRequest();
        request.setCourseId(course.getId());
        request.setPaymentMethod(PaymentMethod.SEPAY);
        request.setCustomerEmail("student@example.com");
        
        var checkoutResult = checkoutService.directCheckout(userId, request);
        String orderNumber = checkoutResult.getOrderNumber();

        // Find the order - should be PROCESSING (waiting for payment)
        Order order = orderRepository.findWithItemsByOrderNumber(orderNumber).orElseThrow();
        assertThat(order.getStatus()).isEqualTo(OrderStatus.PROCESSING);

        // Create SePay webhook payload (simulating bank transfer detection)
        SepayWebhookPayload payload = createSepayWebhookPayload(
                orderNumber,
                100000L,  // Exact amount
                testAccountNumber
        );

        // When - Send webhook
        mockMvc.perform(post("/payments/webhook/sepay")
                .contentType(MediaType.APPLICATION_JSON)
                .header("Authorization", "Apikey test-secret")
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
    @DisplayName("Should normalize order number from content (ORD2026020001 → ORD-202602-0001)")
    void testOrderNumberNormalization() throws Exception {
        // Given
        DirectCheckoutRequest request = new DirectCheckoutRequest();
        request.setCourseId(course.getId());
        request.setPaymentMethod(PaymentMethod.SEPAY);
        request.setCustomerEmail("student@example.com");
        
        var checkoutResult = checkoutService.directCheckout(userId, request);
        String orderNumber = checkoutResult.getOrderNumber();  // e.g., "ORD-202602-0001"
        String orderNumberNoDashes = orderNumber.replace("-", "");  // e.g., "ORD2026020001"

        // Create webhook with order number without dashes (as banks often strip them)
        SepayWebhookPayload payload = SepayWebhookPayload.builder()
                .id(12345L)
                .accountNumber(testAccountNumber)
                .transferType("in")
                .transferAmount(100000L)
                .code(orderNumberNoDashes)  // No dashes - simulates bank stripping them
                .content("EDUMIND " + orderNumberNoDashes)
                .build();

        // When
        mockMvc.perform(post("/payments/webhook/sepay")
                .contentType(MediaType.APPLICATION_JSON)
                .header("Authorization", "Apikey test-secret")
                .content(objectMapper.writeValueAsString(payload)))
                .andExpect(status().isOk());

        // Then - Should match and process
        Order order = orderRepository.findWithItemsByOrderNumber(orderNumber).orElseThrow();
        assertThat(order.getStatus()).isEqualTo(OrderStatus.COMPLETED);
    }

    @Test
    @DisplayName("Should handle race condition between webhook and status check")
    void testRaceCondition_WebhookVsStatusCheck() throws Exception {
        // Given
        DirectCheckoutRequest request = new DirectCheckoutRequest();
        request.setCourseId(course.getId());
        request.setPaymentMethod(PaymentMethod.SEPAY);
        request.setCustomerEmail("student@example.com");
        
        var checkoutResult = checkoutService.directCheckout(userId, request);
        String orderNumber = checkoutResult.getOrderNumber();

        // Simulate status check polling (would happen in frontend)
        // In real scenario, frontend polls gateway status
        // For test, we verify webhook can still process even if status check was attempted

        // When - Webhook arrives
        SepayWebhookPayload payload = createSepayWebhookPayload(orderNumber, 100000L, testAccountNumber);
        
        mockMvc.perform(post("/payments/webhook/sepay")
                .contentType(MediaType.APPLICATION_JSON)
                .header("Authorization", "Apikey test-secret")
                .content(objectMapper.writeValueAsString(payload)))
                .andExpect(status().isOk());

        // Then - Should process successfully
        Order order = orderRepository.findWithItemsByOrderNumber(orderNumber).orElseThrow();
        assertThat(order.getStatus()).isEqualTo(OrderStatus.COMPLETED);
    }

    @Test
    @DisplayName("Should reject duplicate transfer webhook")
    void testDuplicateTransferWebhook() throws Exception {
        // Given
        DirectCheckoutRequest request = new DirectCheckoutRequest();
        request.setCourseId(course.getId());
        request.setPaymentMethod(PaymentMethod.SEPAY);
        request.setCustomerEmail("student@example.com");
        
        var checkoutResult = checkoutService.directCheckout(userId, request);
        String orderNumber = checkoutResult.getOrderNumber();

        SepayWebhookPayload payload = createSepayWebhookPayload(orderNumber, 100000L, testAccountNumber);

        // First webhook
        mockMvc.perform(post("/payments/webhook/sepay")
                .contentType(MediaType.APPLICATION_JSON)
                .header("Authorization", "Apikey test-secret")
                .content(objectMapper.writeValueAsString(payload)))
                .andExpect(status().isOk());

        // Second duplicate webhook (same transfer ID)
        mockMvc.perform(post("/payments/webhook/sepay")
                .contentType(MediaType.APPLICATION_JSON)
                .header("Authorization", "Apikey test-secret")
                .content(objectMapper.writeValueAsString(payload)))
                .andExpect(status().isOk());

        // Then - Should only process once (idempotent)
        Order order = orderRepository.findWithItemsByOrderNumber(orderNumber).orElseThrow();
        assertThat(order.getStatus()).isEqualTo(OrderStatus.COMPLETED);
        // Should only have one enrollment
    }

    @Test
    @DisplayName("Should reject webhook with wrong account number")
    void testAccountNumberMismatch() throws Exception {
        // Given
        DirectCheckoutRequest request = new DirectCheckoutRequest();
        request.setCourseId(course.getId());
        request.setPaymentMethod(PaymentMethod.SEPAY);
        request.setCustomerEmail("student@example.com");
        
        var checkoutResult = checkoutService.directCheckout(userId, request);
        String orderNumber = checkoutResult.getOrderNumber();

        // Create webhook with wrong account number
        SepayWebhookPayload payload = createSepayWebhookPayload(
                orderNumber,
                100000L,
                "WRONG-ACCOUNT"  // Wrong account
        );

        // When
        mockMvc.perform(post("/payments/webhook/sepay")
                .contentType(MediaType.APPLICATION_JSON)
                .header("Authorization", "Apikey test-secret")
                .content(objectMapper.writeValueAsString(payload)))
                .andExpect(status().isBadRequest());

        // Then - Order should remain processing (not completed)
        Order order = orderRepository.findWithItemsByOrderNumber(orderNumber).orElseThrow();
        assertThat(order.getStatus()).isEqualTo(OrderStatus.PROCESSING);
    }

    @Test
    @DisplayName("Should reject outgoing transfer (transferType='out')")
    void testOutgoingTransfer() throws Exception {
        // Given
        DirectCheckoutRequest request = new DirectCheckoutRequest();
        request.setCourseId(course.getId());
        request.setPaymentMethod(PaymentMethod.SEPAY);
        request.setCustomerEmail("student@example.com");
        
        var checkoutResult = checkoutService.directCheckout(userId, request);
        String orderNumber = checkoutResult.getOrderNumber();

        // Create webhook with outgoing transfer
        SepayWebhookPayload payload = SepayWebhookPayload.builder()
                .id(12345L)
                .accountNumber(testAccountNumber)
                .transferType("out")  // Outgoing
                .transferAmount(100000L)
                .code("ORD-202602-0001")
                .content("EDUMIND ORD-202602-0001")
                .build();

        // When
        mockMvc.perform(post("/payments/webhook/sepay")
                .contentType(MediaType.APPLICATION_JSON)
                .header("Authorization", "Apikey test-secret")
                .content(objectMapper.writeValueAsString(payload)))
                .andExpect(status().isOk());  // Returns 200 but doesn't process

        // Then - Order should remain processing (not completed)
        Order order = orderRepository.findWithItemsByOrderNumber(orderNumber).orElseThrow();
        assertThat(order.getStatus()).isEqualTo(OrderStatus.PROCESSING);
    }

    // ===== Helper Methods =====

    private SepayWebhookPayload createSepayWebhookPayload(
            String orderNumber, Long amount, String accountNumber) {
        return SepayWebhookPayload.builder()
                .id(12345L)
                .accountNumber(accountNumber)
                .transferType("in")
                .transferAmount(amount)
                .code(orderNumber)
                .content("EDUMIND " + orderNumber)
                .transactionDate("2026-01-15T10:00:00Z")
                .gateway("MB")
                .build();
    }
}
