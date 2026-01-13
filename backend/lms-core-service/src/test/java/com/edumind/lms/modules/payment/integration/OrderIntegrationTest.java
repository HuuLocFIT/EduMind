package com.edumind.lms.modules.payment.integration;

import com.edumind.lms.modules.course.entity.Category;
import com.edumind.lms.modules.course.entity.Course;
import com.edumind.lms.modules.course.enums.CourseStatus;
import com.edumind.lms.modules.course.repository.CategoryRepository;
import com.edumind.lms.modules.course.repository.CourseRepository;
import com.edumind.lms.modules.payment.BaseIntegrationTest;
import com.edumind.lms.modules.payment.dto.request.DirectCheckoutRequest;
import com.edumind.lms.modules.payment.enums.PaymentMethod;
import com.edumind.lms.modules.payment.repository.OrderRepository;
import com.edumind.lms.modules.payment.service.CheckoutService;
import com.edumind.lms.config.security.JwtUserPrincipal;
import jakarta.persistence.EntityManager;
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

class OrderIntegrationTest extends BaseIntegrationTest {

    @Autowired
    private CourseRepository courseRepository;

    @Autowired
    private CategoryRepository categoryRepository;

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private CheckoutService checkoutService;

    @Autowired
    private EntityManager entityManager;

    private Course course;
    private Long userId = 1L;

    @BeforeEach
    void setUp() {
        orderRepository.deleteAll();
        courseRepository.deleteAll();
        categoryRepository.deleteAll();

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
        entityManager.flush();
        entityManager.clear();
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
        entityManager.flush();
        entityManager.clear();
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
        entityManager.flush();
        entityManager.clear();

        mockMvc.perform(get("/orders/count"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.total").value(greaterThan(0)));
    }
}
