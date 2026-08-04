package com.edumind.lms.modules.course.controller;

import com.edumind.lms.config.security.TeacherSecurity;
import com.edumind.lms.config.security.JwtTokenProvider;
import com.edumind.lms.modules.course.dto.response.EnrollmentResponse;
import com.edumind.lms.modules.course.entity.Enrollment;
import com.edumind.lms.modules.course.enums.EnrollmentStatus;
import com.edumind.lms.modules.course.exception.EnrollmentNotFoundException;
import com.edumind.lms.modules.course.service.CourseService;
import com.edumind.lms.modules.course.service.EnrollmentService;
import com.edumind.lms.modules.course.util.EnrollmentMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
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
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = EnrollmentController.class, excludeAutoConfiguration = {
        SecurityAutoConfiguration.class,
        SecurityFilterAutoConfiguration.class,
        OAuth2ClientAutoConfiguration.class,
        OAuth2ResourceServerAutoConfiguration.class
})
@AutoConfigureMockMvc(addFilters = false) // Disable security filters
@DisplayName("EnrollmentController Unit Tests")
class EnrollmentControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private EnrollmentService enrollmentService;

    @MockBean
    private EnrollmentMapper enrollmentMapper;

    @MockBean
    private CourseService courseService;

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
    @DisplayName("GET /enrollments/course/{courseId} - Existing enrollment returns 200 with courseId")
    void getMyEnrollmentForCourse_Success() throws Exception {
        Enrollment enrollment = Enrollment.builder()
                .studentId(userId)
                .status(EnrollmentStatus.ACTIVE)
                .build();

        EnrollmentResponse response = EnrollmentResponse.builder()
                .id(10L)
                .courseId(100L)
                .courseTitle("Test Course")
                .studentId(userId)
                .status(EnrollmentStatus.ACTIVE)
                .build();

        when(enrollmentService.getEnrollmentByCourseAndStudent(eq(100L), eq(userId))).thenReturn(enrollment);
        when(enrollmentMapper.toResponse(any(Enrollment.class))).thenReturn(response);

        mockMvc.perform(get("/enrollments/course/{courseId}", 100L)
                .principal(auth))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.courseId").value(100));

        verify(enrollmentService).getEnrollmentByCourseAndStudent(100L, userId);
        verify(enrollmentMapper).toResponse(enrollment);
    }

    @Test
    @DisplayName("GET /enrollments/course/{courseId} - No enrollment returns 404")
    void getMyEnrollmentForCourse_NotFound_Returns404() throws Exception {
        when(enrollmentService.getEnrollmentByCourseAndStudent(eq(100L), eq(userId)))
                .thenThrow(new EnrollmentNotFoundException(100L, userId));

        mockMvc.perform(get("/enrollments/course/{courseId}", 100L)
                .principal(auth))
                .andExpect(status().isNotFound());

        verify(enrollmentService).getEnrollmentByCourseAndStudent(100L, userId);
    }

    @Test
    @DisplayName("GET /enrollments/course/{courseId} - DROPPED enrollment still returns 200 with DROPPED status")
    void getMyEnrollmentForCourse_DroppedStatus_Returns200() throws Exception {
        Enrollment enrollment = Enrollment.builder()
                .studentId(userId)
                .status(EnrollmentStatus.DROPPED)
                .build();

        EnrollmentResponse response = EnrollmentResponse.builder()
                .id(10L)
                .courseId(100L)
                .courseTitle("Test Course")
                .studentId(userId)
                .status(EnrollmentStatus.DROPPED)
                .build();

        when(enrollmentService.getEnrollmentByCourseAndStudent(eq(100L), eq(userId))).thenReturn(enrollment);
        when(enrollmentMapper.toResponse(any(Enrollment.class))).thenReturn(response);

        mockMvc.perform(get("/enrollments/course/{courseId}", 100L)
                .principal(auth))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.courseId").value(100))
                .andExpect(jsonPath("$.data.status").value("DROPPED"));

        verify(enrollmentService).getEnrollmentByCourseAndStudent(100L, userId);
        verify(enrollmentMapper).toResponse(enrollment);
    }

    @Test
    @DisplayName("GET /enrollments/enrolled?courseIds=1,2,3 - returns enrolled course ids")
    void getEnrolledCourseIds_ReturnsEnrolledCourseIds() throws Exception {
        when(enrollmentService.findEnrolledCourseIds(eq(userId), anyList())).thenReturn(List.of(1L, 3L));

        mockMvc.perform(get("/enrollments/enrolled")
                .param("courseIds", "1,2,3")
                .principal(auth))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0]").value(1))
                .andExpect(jsonPath("$.data[1]").value(3));

        verify(enrollmentService).findEnrolledCourseIds(userId, List.of(1L, 2L, 3L));
    }

    @Test
    @DisplayName("GET /enrollments/enrolled - empty courseIds returns empty list without querying")
    void getEnrolledCourseIds_EmptyCourseIds_ReturnsEmptyList() throws Exception {
        mockMvc.perform(get("/enrollments/enrolled")
                .principal(auth))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").isEmpty());

        verify(enrollmentService, never()).findEnrolledCourseIds(any(), any());
    }
}
