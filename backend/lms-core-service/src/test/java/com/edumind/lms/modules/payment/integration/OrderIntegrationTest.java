package com.edumind.lms.modules.payment.integration;

import com.edumind.lms.modules.course.entity.Category;
import com.edumind.lms.modules.course.entity.Course;
import com.edumind.lms.modules.course.enums.CourseStatus;
import com.edumind.lms.modules.payment.BasePaymentIntegrationTest;
import com.edumind.lms.modules.payment.dto.request.DirectCheckoutRequest;
import com.edumind.lms.modules.payment.enums.PaymentMethod;
import com.edumind.lms.modules.payment.service.CheckoutService;
import com.edumind.lms.config.security.JwtUserPrincipal;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.hamcrest.Matchers.*;

/**
 * Integration tests for order functionality.
 * Extends BasePaymentIntegrationTest (non-transactional) to allow REQUIRES_NEW transactions
 * to see committed order data during payment processing.
 */
class OrderIntegrationTest extends BasePaymentIntegrationTest {

    @Autowired
    private CheckoutService checkoutService;

    private Course course;
    private Long userId = 1L;

    @BeforeEach
    void setUp() {
        // Note: cleanup is handled by BasePaymentIntegrationTest.cleanupTestData() in @AfterEach

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
    void getMyOrders_ShouldReturnOrders_WhenUserHasOrders() throws Exception {
        // Create an order first
        DirectCheckoutRequest request = new DirectCheckoutRequest();
        request.setCourseId(course.getId());
        request.setPaymentMethod(PaymentMethod.MOCK);
        request.setCustomerEmail("student@example.com");
        checkoutService.directCheckout(userId, request);

        mockMvc.perform(get("/orders"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(greaterThan(0))))
                .andExpect(jsonPath("$.data[0].orderNumber").exists());
    }

    @Test
    void getOrderById_ShouldReturnOrder_WhenOrderExists() throws Exception {
        // Create an order first
        DirectCheckoutRequest request = new DirectCheckoutRequest();
        request.setCourseId(course.getId());
        request.setPaymentMethod(PaymentMethod.MOCK);
        request.setCustomerEmail("student@example.com");
        var result = checkoutService.directCheckout(userId, request);
        Long orderId = result.getOrderId();

        mockMvc.perform(get("/orders/{id}", orderId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.id").value(orderId))
                .andExpect(jsonPath("$.data.orderNumber").exists());
    }

    @Test
    void getOrderByNumber_ShouldReturnOrder_WhenOrderExists() throws Exception {
        // Create an order first
        DirectCheckoutRequest request = new DirectCheckoutRequest();
        request.setCourseId(course.getId());
        request.setPaymentMethod(PaymentMethod.MOCK);
        request.setCustomerEmail("student@example.com");
        var result = checkoutService.directCheckout(userId, request);
        String orderNumber = result.getOrderNumber();

        mockMvc.perform(get("/orders/number/{orderNumber}", orderNumber))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.orderNumber").value(orderNumber));
    }

    @Test
    void getOrderCounts_ShouldReturnCounts() throws Exception {
        // Create an order first
        DirectCheckoutRequest request = new DirectCheckoutRequest();
        request.setCourseId(course.getId());
        request.setPaymentMethod(PaymentMethod.MOCK);
        request.setCustomerEmail("student@example.com");
        checkoutService.directCheckout(userId, request);

        mockMvc.perform(get("/orders/count"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.total").value(greaterThan(0)));
    }

    @Test
    void getOrderById_NotFound_ReturnsNotFound() throws Exception {
        mockMvc.perform(get("/orders/{id}", 999L))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    void getMyOrders_Empty_ReturnsEmptyList() throws Exception {
        // No orders created
        mockMvc.perform(get("/orders"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data", hasSize(0)));
    }

    @Test
    void getMyOrders_WithStatusFilter_FiltersCorrectly() throws Exception {
        // Create an order (should be COMPLETED by mock gateway)
        DirectCheckoutRequest request = new DirectCheckoutRequest();
        request.setCourseId(course.getId());
        request.setPaymentMethod(PaymentMethod.MOCK);
        request.setCustomerEmail("student@example.com");
        checkoutService.directCheckout(userId, request);

        // Filter by COMPLETED - should return 1
        mockMvc.perform(get("/orders").param("status", "COMPLETED"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(greaterThan(0))));

        // Filter by PENDING - should return 0
        mockMvc.perform(get("/orders").param("status", "PENDING"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(0)));
    }
}
