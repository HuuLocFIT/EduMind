package com.edumind.lms.modules.payment.integration;

import com.edumind.lms.modules.course.entity.Category;
import com.edumind.lms.modules.course.entity.Course;
import com.edumind.lms.modules.course.enums.CourseStatus;
import com.edumind.lms.modules.course.repository.CategoryRepository;
import com.edumind.lms.modules.course.repository.CourseRepository;
import com.edumind.lms.modules.payment.BaseIntegrationTest;
import com.edumind.lms.modules.payment.dto.request.AddToCartRequest;
import com.edumind.lms.modules.payment.dto.request.CheckoutRequest;
import com.edumind.lms.modules.payment.dto.request.DirectCheckoutRequest;
import com.edumind.lms.modules.payment.enums.PaymentMethod;
import com.edumind.lms.modules.payment.repository.CartRepository;
import com.edumind.lms.modules.payment.repository.OrderRepository;
import com.edumind.lms.modules.payment.service.CartService;
import com.edumind.lms.config.security.JwtUserPrincipal;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.hamcrest.Matchers.*;

class CheckoutIntegrationTest extends BaseIntegrationTest {

    @Autowired
    private CourseRepository courseRepository;

    @Autowired
    private CategoryRepository categoryRepository;

    @Autowired
    private CartRepository cartRepository;

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private CartService cartService;

    private Course course;
    private Long userId = 1L;

    @BeforeEach
    void setUp() {
        orderRepository.deleteAll();
        cartRepository.deleteAll();
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
    void previewCheckout_ShouldReturnPreview_WhenCartHasItems() throws Exception {
        // Add item to cart first
        AddToCartRequest cartRequest = new AddToCartRequest();
        cartRequest.setCourseId(course.getId());
        cartService.addToCart(userId, cartRequest);

        mockMvc.perform(post("/checkout/preview"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.items", hasSize(1)))
                .andExpect(jsonPath("$.data.subtotal").value(49.99))
                .andExpect(jsonPath("$.data.totalAmount").value(49.99));
    }

    @Test
    void checkout_ShouldCreateOrder_WhenCartHasItems() throws Exception {
        // Add item to cart first
        AddToCartRequest cartRequest = new AddToCartRequest();
        cartRequest.setCourseId(course.getId());
        cartService.addToCart(userId, cartRequest);

        CheckoutRequest request = new CheckoutRequest();
        request.setPaymentMethod(PaymentMethod.MOCK);
        request.setCustomerEmail("student@example.com");

        mockMvc.perform(post("/checkout")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.orderNumber").exists())
                .andExpect(jsonPath("$.data.totalAmount").value(49.99));
    }

    @Test
    void previewDirectCheckout_ShouldReturnPreview_WhenCourseExists() throws Exception {
        mockMvc.perform(post("/checkout/direct/preview")
                .param("courseId", course.getId().toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.items", hasSize(1)))
                .andExpect(jsonPath("$.data.totalAmount").value(49.99));
    }

    @Test
    void directCheckout_ShouldCreateOrder_WhenCourseExists() throws Exception {
        DirectCheckoutRequest request = new DirectCheckoutRequest();
        request.setCourseId(course.getId());
        request.setPaymentMethod(PaymentMethod.MOCK);
        request.setCustomerEmail("student@example.com");

        mockMvc.perform(post("/checkout/direct")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.orderNumber").exists())
                .andExpect(jsonPath("$.data.totalAmount").value(49.99));
    }
}
