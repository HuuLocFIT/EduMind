package com.edumind.auth.controller;

import com.edumind.auth.config.TestSecurityConfig;
import com.edumind.auth.dto.request.TeacherApplicationRequest;
import com.edumind.auth.dto.response.TeacherApplicationResponse;
import com.edumind.auth.dto.response.TrialStatusResponse;
import com.edumind.auth.enums.DocumentType;
import com.edumind.auth.service.TeacherApplicationService;
import com.edumind.common.response.MessageResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(TeacherApplicationController.class)
@Import(TestSecurityConfig.class)
class TeacherApplicationControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private TeacherApplicationService applicationService;

    private TeacherApplicationRequest applicationRequest;

    @BeforeEach
    void setUp() {
        TeacherApplicationRequest.DocumentInfo doc = new TeacherApplicationRequest.DocumentInfo(
                "https://cloudinary.com/doc.pdf", DocumentType.CERTIFICATE, "certificate.pdf");

        applicationRequest = new TeacherApplicationRequest();
        applicationRequest.setFirstName("John");
        applicationRequest.setLastName("Doe");
        applicationRequest.setEmail("john@example.com");
        applicationRequest.setPhone("0123456789");
        applicationRequest.setSubject("Mathematics");
        applicationRequest.setExperienceYears(5);
        applicationRequest.setQualifications("Master's Degree");
        applicationRequest.setMotivation("I love teaching");
        applicationRequest.setDocuments(List.of(doc));
    }

    @Nested
    @DisplayName("POST /teacher-application/submit")
    class SubmitApplicationTests {

        @Test
        @WithMockUser(roles = "STUDENT")
        @DisplayName("Should submit application successfully")
        void submitApplication_Success() throws Exception {
            MessageResponse response = MessageResponse.builder()
                    .status(HttpStatus.CREATED.value())
                    .success(true)
                    .message("Application submitted")
                    .build();

            when(applicationService.submitApplication(any(TeacherApplicationRequest.class))).thenReturn(response);

            mockMvc.perform(post("/teacher-application/submit")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(applicationRequest)))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.success").value(true));
        }
    }

    @Nested
    @DisplayName("GET /teacher-application/my-application")
    class GetMyApplicationTests {

        @Test
        @WithMockUser(username = "testuser")
        @DisplayName("Should return user's application")
        void getMyApplication_Success() throws Exception {
            TeacherApplicationResponse appResponse = TeacherApplicationResponse.builder()
                    .id(1L)
                    .firstName("John")
                    .lastName("Doe")
                    .status("PENDING")
                    .build();

            when(applicationService.getMyApplication()).thenReturn(appResponse);

            mockMvc.perform(get("/teacher-application/my-application"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data.status").value("PENDING"));
        }
    }

    @Nested
    @DisplayName("GET /teacher-application/trial-status")
    class GetTrialStatusTests {

        @Test
        @WithMockUser(roles = "TEACHER_TRIAL")
        @DisplayName("Should return trial status")
        void getTrialStatus_Success() throws Exception {
            TrialStatusResponse trialResponse = TrialStatusResponse.builder()
                    .userId(1L)
                    .username("trialteacher")
                    .isTrial(true)
                    .trialEndDate(LocalDateTime.now().plusDays(15))
                    .daysRemaining(15L)
                    .isExpired(false)
                    .build();

            when(applicationService.getMyTrialStatus()).thenReturn(trialResponse);

            mockMvc.perform(get("/teacher-application/trial-status"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data.isTrial").value(true));
        }
    }
}
