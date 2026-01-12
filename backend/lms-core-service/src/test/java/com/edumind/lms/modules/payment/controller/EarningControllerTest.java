package com.edumind.lms.modules.payment.controller;

import com.edumind.common.response.PagedResponse;
import com.edumind.lms.config.security.JwtTokenProvider;
import com.edumind.lms.config.security.TeacherSecurity;
import com.edumind.lms.modules.payment.dto.response.CourseEarningResponse;
import com.edumind.lms.modules.payment.dto.response.EarningResponse;
import com.edumind.lms.modules.payment.dto.response.EarningsSummaryResponse;
import com.edumind.lms.modules.payment.dto.response.MonthlyEarningResponse;
import com.edumind.lms.modules.payment.service.EarningService;
import com.fasterxml.jackson.databind.ObjectMapper;
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
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Collections;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = EarningController.class, excludeAutoConfiguration = {
        SecurityAutoConfiguration.class,
        SecurityFilterAutoConfiguration.class,
        OAuth2ClientAutoConfiguration.class,
        OAuth2ResourceServerAutoConfiguration.class
})
@AutoConfigureMockMvc(addFilters = false)
@DisplayName("EarningController Unit Tests")
class EarningControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private EarningService earningService;

    @MockBean(name = "teacherSecurity")
    private TeacherSecurity teacherSecurity;

    @MockBean(name = "jwtTokenProvider")
    private JwtTokenProvider jwtTokenProvider;

    @Autowired
    private ObjectMapper objectMapper;

    private Long instructorId = 1L;
    private UsernamePasswordAuthenticationToken auth;
    private EarningResponse earningResponse;
    private EarningsSummaryResponse summaryResponse;

    @BeforeEach
    void setUp() {
        auth = new UsernamePasswordAuthenticationToken(instructorId.toString(), null, Collections.emptyList());
        SecurityContextHolder.getContext().setAuthentication(auth);

        earningResponse = EarningResponse.builder()
                .id(1L)
                .netAmount(new BigDecimal("80.00"))
                .courseId(100L)
                .build();

        summaryResponse = EarningsSummaryResponse.builder()
                .totalNetEarnings(new BigDecimal("1000.00"))
                .pendingEarnings(new BigDecimal("200.00"))
                .paidEarnings(new BigDecimal("800.00"))
                .build();
    }

    @Test
    @DisplayName("GET /teacher/earnings - Get earnings success")
    void getMyEarnings_Success() throws Exception {
        Page<EarningResponse> page = new PageImpl<>(List.of(earningResponse));
        when(earningService.getEarningsByInstructor(eq(instructorId), any(), any(), any(), any(), any(Pageable.class)))
                .thenReturn(page);

        mockMvc.perform(get("/teacher/earnings")
                .principal(auth))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].netAmount").value(80.00)); 
        // Wait. EarningController returns ResponseEntity<PagedResponse<EarningResponse>>.
        // As seen in OrderController, PagedResponse likely translates to .data (Array) or .data.content if wrapped.
        // OrderController was: `ResponseEntity.ok(PagedResponse.of(...))`. And it output `data: [...]`.
        // EarningController is the same.
        // So I should check `$.data[0].amount`.
    }

    @Test
    @DisplayName("GET /teacher/earnings/summary - Get summary success")
    void getEarningsSummary_Success() throws Exception {
        when(earningService.getEarningsSummary(eq(instructorId), any(), any())).thenReturn(summaryResponse);

        mockMvc.perform(get("/teacher/earnings/summary")
                .principal(auth))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.totalNetEarnings").value(1000.00));
    }

    @Test
    @DisplayName("GET /teacher/earnings/monthly - Get monthly earnings success")
    void getMonthlyEarnings_Success() throws Exception {
        MonthlyEarningResponse monthly = MonthlyEarningResponse.builder()
                .year(2025)
                .month(1)
                .netEarnings(new BigDecimal("500.00"))
                .build();
        
        when(earningService.getMonthlyEarnings(instructorId, 12)).thenReturn(List.of(monthly));

        mockMvc.perform(get("/teacher/earnings/monthly")
                .principal(auth))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].month").value(1));
    }

    @Test
    @DisplayName("GET /teacher/earnings/by-course - Get earnings by course success")
    void getEarningsByCourse_Success() throws Exception {
        CourseEarningResponse courseEarning = CourseEarningResponse.builder()
                .courseId(100L)
                .courseTitle("Test Course")
                .totalNetEarnings(new BigDecimal("500.00"))
                .build();

        when(earningService.getEarningsByCourse(eq(instructorId), any(), any())).thenReturn(List.of(courseEarning));

        mockMvc.perform(get("/teacher/earnings/by-course")
                .principal(auth))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].courseId").value(100));
    }
}
