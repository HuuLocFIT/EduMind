package com.edumind.lms.modules.payment.integration;

import com.edumind.lms.modules.course.entity.Category;
import com.edumind.lms.modules.course.entity.Course;
import com.edumind.lms.modules.course.enums.CourseStatus;
import com.edumind.lms.modules.course.repository.CategoryRepository;
import com.edumind.lms.modules.course.repository.CourseRepository;
import com.edumind.lms.modules.payment.BaseIntegrationTest;
import com.edumind.lms.modules.payment.dto.request.DirectCheckoutRequest;
import com.edumind.lms.modules.payment.enums.PaymentMethod;
import com.edumind.lms.modules.payment.repository.InstructorEarningRepository;
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

class EarningIntegrationTest extends BaseIntegrationTest {

    @Autowired
    private CourseRepository courseRepository;

    @Autowired
    private CategoryRepository categoryRepository;

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private InstructorEarningRepository earningRepository;

    @Autowired
    private CheckoutService checkoutService;

    @Autowired
    private EntityManager entityManager;

    private Course course;
    private Long instructorId = 101L;
    private Long studentId = 1L;

    @BeforeEach
    void setUp() {
        earningRepository.deleteAll();
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
                .instructorId(instructorId)
                .instructorName("Prof. Test")
                .category(category)
                .price(new BigDecimal("100.00"))
                .currency("USD")
                .status(CourseStatus.PUBLISHED)
                .publishedAt(LocalDateTime.now())
                .totalLessons(0)
                .build();
        courseRepository.save(course);
    }
    
    private void setupTeacherSecurityContext() {
        JwtUserPrincipal principal = new JwtUserPrincipal(
            instructorId,
            "teacher",
            "teacher@example.com",
            List.of(new SimpleGrantedAuthority("ROLE_TEACHER")),
            null
        );
        
        UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
            principal,
            null,
            principal.authorities()
        );
        
        SecurityContextHolder.getContext().setAuthentication(authentication);
    }
    
    private void setupStudentSecurityContext() {
        JwtUserPrincipal principal = new JwtUserPrincipal(
            studentId,
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
    void getMyEarnings_ShouldReturnEarnings_WhenTeacherHasEarnings() throws Exception {
        // Create a purchase as student
        setupStudentSecurityContext();
        DirectCheckoutRequest request = new DirectCheckoutRequest();
        request.setCourseId(course.getId());
        request.setPaymentMethod(PaymentMethod.MOCK);
        request.setCustomerEmail("student@example.com");
        checkoutService.directCheckout(studentId, request);
        entityManager.flush();
        entityManager.clear();

        // Now get earnings as teacher
        setupTeacherSecurityContext();
        
        mockMvc.perform(get("/teacher/earnings"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(greaterThan(0))));
    }

    @Test
    void getEarningsSummary_ShouldReturnSummary() throws Exception {
        // Create a purchase as student
        setupStudentSecurityContext();
        DirectCheckoutRequest request = new DirectCheckoutRequest();
        request.setCourseId(course.getId());
        request.setPaymentMethod(PaymentMethod.MOCK);
        checkoutService.directCheckout(studentId, request);

        // Now get summary as teacher
        setupTeacherSecurityContext();
        
        mockMvc.perform(get("/teacher/earnings/summary"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").exists());
    }

    @Test
    void getEarningsByCourse_ShouldReturnCourseEarnings() throws Exception {
        // Create a purchase as student
        setupStudentSecurityContext();
        DirectCheckoutRequest request = new DirectCheckoutRequest();
        request.setCourseId(course.getId());
        request.setPaymentMethod(PaymentMethod.MOCK);
        checkoutService.directCheckout(studentId, request);

        // Now get earnings by course as teacher
        setupTeacherSecurityContext();
        
        mockMvc.perform(get("/teacher/earnings/by-course"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data", hasSize(greaterThan(0))));
    }
}
