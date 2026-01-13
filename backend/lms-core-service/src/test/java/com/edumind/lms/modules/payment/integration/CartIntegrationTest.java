package com.edumind.lms.modules.payment.integration;

import com.edumind.lms.modules.course.entity.Category;
import com.edumind.lms.modules.course.entity.Course;
import com.edumind.lms.modules.course.enums.CourseStatus;
import com.edumind.lms.modules.course.repository.CategoryRepository;
import com.edumind.lms.modules.course.repository.CourseRepository;
import com.edumind.lms.modules.payment.BaseIntegrationTest;
import com.edumind.lms.modules.payment.dto.request.AddToCartRequest;
import com.edumind.lms.modules.payment.repository.CartRepository;
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

class CartIntegrationTest extends BaseIntegrationTest {

    @Autowired
    private CourseRepository courseRepository;

    @Autowired
    private CategoryRepository categoryRepository;

    @Autowired
    private CartRepository cartRepository;

    private Course course;
    private Long userId = 1L;

    @BeforeEach
    void setUp() {
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
    void addToCart_ShouldAddItem_WhenCourseExists() throws Exception {
        AddToCartRequest request = new AddToCartRequest();
        request.setCourseId(course.getId());

        mockMvc.perform(post("/cart/items")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.items[0].courseId").value(course.getId()))
                .andExpect(jsonPath("$.data.items[0].effectivePrice").value(49.99));
    }

    @Test
    void getCart_ShouldReturnItems_WhenCartNotEmpty() throws Exception {
        // First add item
        AddToCartRequest request = new AddToCartRequest();
        request.setCourseId(course.getId());
        
        mockMvc.perform(post("/cart/items")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk());

        // Then get cart
        mockMvc.perform(get("/cart"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.items", hasSize(1)))
                .andExpect(jsonPath("$.data.totalAmount").value(49.99));
    }

    @Test
    void removeFromCart_ShouldRemoveItem() throws Exception {
        // Add item first
        AddToCartRequest request = new AddToCartRequest();
        request.setCourseId(course.getId());
        
        mockMvc.perform(post("/cart/items")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk());

        // Remove item
        mockMvc.perform(delete("/cart/items/{courseId}", course.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.items", hasSize(0)));
    }
}
