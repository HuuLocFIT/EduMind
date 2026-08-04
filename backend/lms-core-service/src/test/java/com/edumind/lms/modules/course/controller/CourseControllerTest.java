package com.edumind.lms.modules.course.controller;

import com.edumind.lms.config.security.TeacherSecurity;
import com.edumind.lms.config.security.JwtTokenProvider;
import com.edumind.lms.modules.course.service.CategoryService;
import com.edumind.lms.modules.course.service.CourseService;
import com.edumind.lms.modules.course.service.InstructorNameResolver;
import com.edumind.lms.modules.course.util.CategoryMapper;
import com.edumind.lms.modules.course.util.CourseMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.security.oauth2.client.servlet.OAuth2ClientAutoConfiguration;
import org.springframework.boot.autoconfigure.security.oauth2.resource.servlet.OAuth2ResourceServerAutoConfiguration;
import org.springframework.boot.autoconfigure.security.servlet.SecurityAutoConfiguration;
import org.springframework.boot.autoconfigure.security.servlet.SecurityFilterAutoConfiguration;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = CourseController.class, excludeAutoConfiguration = {
        SecurityAutoConfiguration.class,
        SecurityFilterAutoConfiguration.class,
        OAuth2ClientAutoConfiguration.class,
        OAuth2ResourceServerAutoConfiguration.class
})
@AutoConfigureMockMvc(addFilters = false) // Disable security filters
@DisplayName("CourseController Unit Tests")
class CourseControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private CourseService courseService;

    @MockBean
    private CategoryService categoryService;

    @MockBean
    private CourseMapper courseMapper;

    @MockBean
    private CategoryMapper categoryMapper;

    @MockBean
    private InstructorNameResolver instructorNameResolver;

    @MockBean(name = "teacherSecurity")
    private TeacherSecurity teacherSecurity;

    @MockBean(name = "jwtTokenProvider")
    private JwtTokenProvider jwtTokenProvider;

    private Long userId = 1L;
    private UsernamePasswordAuthenticationToken auth;

    @BeforeEach
    void setUp() {
        // Setup mock authentication
        auth = new UsernamePasswordAuthenticationToken(userId.toString(), null, Collections.emptyList());
        SecurityContextHolder.getContext().setAuthentication(auth);
    }

    @Test
    @DisplayName("GET /courses/instructor/{instructorId}/picker - returns 200 with picker list")
    void getInstructorCoursePicker_Success() throws Exception {
        Map<String, Object> course1 = new HashMap<>();
        course1.put("id", 101L);
        course1.put("title", "Alpha Course");

        Map<String, Object> course2 = new HashMap<>();
        course2.put("id", 102L);
        course2.put("title", "Beta Course");

        when(courseService.getInstructorCoursePicker(eq(userId)))
                .thenReturn(List.of(course1, course2));

        mockMvc.perform(get("/courses/instructor/{instructorId}/picker", userId)
                .principal(auth))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").isArray())
                .andExpect(jsonPath("$.data[0].id").value(101))
                .andExpect(jsonPath("$.data[0].title").value("Alpha Course"))
                .andExpect(jsonPath("$.data[1].id").value(102))
                .andExpect(jsonPath("$.data[1].title").value("Beta Course"));

        verify(courseService).getInstructorCoursePicker(userId);
    }

    @Test
    @DisplayName("GET /courses/instructor/{instructorId}/picker - non-admin accessing another instructor returns 403")
    void getInstructorCoursePicker_Forbidden_Returns403() throws Exception {
        Long otherInstructorId = 999L;

        mockMvc.perform(get("/courses/instructor/{instructorId}/picker", otherInstructorId)
                .principal(auth))
                .andExpect(status().isForbidden());

        verify(courseService, never()).getInstructorCoursePicker(any());
    }

    @Test
    @DisplayName("GET /courses/instructor/{instructorId}/picker - empty course list returns 200 with empty array")
    void getInstructorCoursePicker_EmptyList_ReturnsOkWithEmptyArray() throws Exception {
        when(courseService.getInstructorCoursePicker(eq(userId)))
                .thenReturn(Collections.emptyList());

        mockMvc.perform(get("/courses/instructor/{instructorId}/picker", userId)
                .principal(auth))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").isArray())
                .andExpect(jsonPath("$.data").isEmpty());

        verify(courseService).getInstructorCoursePicker(userId);
    }

    @Test
    @DisplayName("getInstructorCoursePicker keeps the same @PreAuthorize guard as getCoursesByInstructor")
    void getInstructorCoursePicker_HasSameAuthGuardAsGetCoursesByInstructor() throws Exception {
        // @WebMvcTest with addFilters = false does not execute method security, so the
        // Forbidden_Returns403 test above only exercises the manual self-or-admin check
        // in the controller body, not the @PreAuthorize annotation itself. This assertion
        // guards against someone silently weakening/removing the annotation on the new
        // endpoint without touching the manual check.
        PreAuthorize picker = CourseController.class
                .getDeclaredMethod("getInstructorCoursePicker", Long.class, org.springframework.security.core.Authentication.class)
                .getAnnotation(PreAuthorize.class);
        PreAuthorize byInstructor = CourseController.class
                .getDeclaredMethod("getCoursesByInstructor", Long.class, int.class, int.class, org.springframework.security.core.Authentication.class)
                .getAnnotation(PreAuthorize.class);

        org.assertj.core.api.Assertions.assertThat(picker).isNotNull();
        org.assertj.core.api.Assertions.assertThat(picker.value()).isEqualTo(byInstructor.value());
    }
}
