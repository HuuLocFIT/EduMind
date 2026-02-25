package com.edumind.lms.modules.ai.controller;

import com.edumind.lms.config.security.JwtTokenProvider;
import com.edumind.lms.config.security.TeacherSecurity;
import com.edumind.lms.modules.ai.dto.response.AiJobResponse;
import com.edumind.lms.modules.ai.enums.AiJobStatus;
import com.edumind.lms.modules.ai.enums.AiJobType;
import com.edumind.lms.modules.ai.service.AiJobService;
import com.edumind.lms.modules.ai.service.AiQuizService;
import com.edumind.lms.modules.ai.service.AiSummaryService;
import com.edumind.lms.shared.exception.ResourceNotFoundException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.boot.autoconfigure.security.servlet.SecurityAutoConfiguration;
import org.springframework.boot.autoconfigure.security.servlet.SecurityFilterAutoConfiguration;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.Collections;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(controllers = AiController.class, excludeAutoConfiguration = {
        SecurityAutoConfiguration.class,
        SecurityFilterAutoConfiguration.class
})
@AutoConfigureMockMvc(addFilters = false)
@DisplayName("AiController Unit Tests")
class AiControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private AiJobService aiJobService;

    @MockBean
    private AiQuizService aiQuizService;

    @MockBean
    private AiSummaryService aiSummaryService;

    @MockBean(name = "teacherSecurity")
    private TeacherSecurity teacherSecurity;

    @MockBean(name = "jwtTokenProvider")
    private JwtTokenProvider jwtTokenProvider;

    @Autowired
    private ObjectMapper objectMapper;

    private Long userId = 1L;
    private UsernamePasswordAuthenticationToken auth;
    private AiJobResponse jobResponse;

    @BeforeEach
    void setUp() {
        auth = new UsernamePasswordAuthenticationToken(
                userId.toString(), null, Collections.emptyList());

        jobResponse = AiJobResponse.builder()
                .jobId(42L)
                .jobType(AiJobType.QUIZ_GENERATION)
                .status(AiJobStatus.COMPLETED)
                .userId(userId)
                .referenceId(100L)
                .createdAt(LocalDateTime.now().minusMinutes(5))
                .completedAt(LocalDateTime.now())
                .build();
    }

    @Test
    @DisplayName("GET /ai/jobs/{id} returns job status")
    void getJobStatus_returnsJob() throws Exception {
        when(aiJobService.getJobStatus(42L)).thenReturn(jobResponse);

        mockMvc.perform(get("/ai/jobs/42")
                        .principal(auth)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.jobId").value(42))
                .andExpect(jsonPath("$.data.status").value("COMPLETED"))
                .andExpect(jsonPath("$.data.jobType").value("QUIZ_GENERATION"));
    }

    @Test
    @DisplayName("GET /ai/jobs/{id} returns 404 when job not found")
    void getJobStatus_notFound() throws Exception {
        when(aiJobService.getJobStatus(99999L))
                .thenThrow(new ResourceNotFoundException("AI job not found: 99999"));

        mockMvc.perform(get("/ai/jobs/99999")
                        .principal(auth)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error").value("Not Found"));
    }

    @Test
    @DisplayName("GET /ai/jobs/{id} returns PROCESSING status job")
    void getJobStatus_processingJob() throws Exception {
        AiJobResponse processingJob = AiJobResponse.builder()
                .jobId(43L)
                .jobType(AiJobType.LESSON_SUMMARY)
                .status(AiJobStatus.PROCESSING)
                .userId(userId)
                .referenceId(200L)
                .createdAt(LocalDateTime.now().minusSeconds(30))
                .startedAt(LocalDateTime.now().minusSeconds(10))
                .build();
        when(aiJobService.getJobStatus(43L)).thenReturn(processingJob);

        mockMvc.perform(get("/ai/jobs/43")
                        .principal(auth)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("PROCESSING"))
                .andExpect(jsonPath("$.data.startedAt").isNotEmpty());
    }

    @Test
    @DisplayName("GET /ai/jobs/{id} returns FAILED status job with errorMessage")
    void getJobStatus_failedJob() throws Exception {
        AiJobResponse failedJob = AiJobResponse.builder()
                .jobId(44L)
                .jobType(AiJobType.QUIZ_GENERATION)
                .status(AiJobStatus.FAILED)
                .userId(userId)
                .referenceId(300L)
                .errorMessage("Gemini API quota exceeded")
                .createdAt(LocalDateTime.now().minusMinutes(2))
                .completedAt(LocalDateTime.now().minusMinutes(1))
                .build();
        when(aiJobService.getJobStatus(44L)).thenReturn(failedJob);

        mockMvc.perform(get("/ai/jobs/44")
                        .principal(auth)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("FAILED"))
                .andExpect(jsonPath("$.data.errorMessage").value("Gemini API quota exceeded"));
    }
}
