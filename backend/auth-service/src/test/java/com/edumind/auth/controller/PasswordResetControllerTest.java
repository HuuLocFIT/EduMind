package com.edumind.auth.controller;

import com.edumind.auth.config.TestSecurityConfig;
import com.edumind.auth.dto.request.PasswordResetConfirmRequest;
import com.edumind.auth.dto.request.PasswordResetRequest;
import com.edumind.auth.entity.User;
import com.edumind.auth.service.PasswordResetService;
import com.edumind.common.exception.BadRequestException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(PasswordResetController.class)
@Import(TestSecurityConfig.class)
class PasswordResetControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private PasswordResetService passwordResetService;

    @Nested
    @DisplayName("POST /auth/password/forgot")
    class ForgotPasswordTests {

        @Test
        @DisplayName("Should accept forgot password request")
        void forgotPassword_Success() throws Exception {
            PasswordResetRequest request = new PasswordResetRequest();
            request.setEmail("user@example.com");

            doNothing().when(passwordResetService).requestPasswordReset(anyString(), any());

            mockMvc.perform(post("/auth/password/forgot")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true));
        }
    }

    @Nested
    @DisplayName("GET /auth/password/validate-token")
    class ValidateTokenTests {

        @Test
        @DisplayName("Should validate token successfully")
        void validateToken_Success() throws Exception {
            User user = User.builder()
                    .id(1L)
                    .email("user@example.com")
                    .build();

            when(passwordResetService.validateResetToken("valid-token")).thenReturn(user);

            mockMvc.perform(get("/auth/password/validate-token")
                            .param("token", "valid-token"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data.email").value("user@example.com"));
        }

        @Test
        @DisplayName("Should return bad request for invalid token")
        void validateToken_InvalidToken() throws Exception {
            when(passwordResetService.validateResetToken("invalid-token"))
                    .thenThrow(new BadRequestException("Invalid password reset token"));

            mockMvc.perform(get("/auth/password/validate-token")
                            .param("token", "invalid-token"))
                    .andExpect(status().isBadRequest());
        }
    }

    @Nested
    @DisplayName("POST /auth/password/reset")
    class ResetPasswordTests {

        @Test
        @DisplayName("Should reset password successfully")
        void resetPassword_Success() throws Exception {
            PasswordResetConfirmRequest request = new PasswordResetConfirmRequest();
            request.setToken("valid-token");
            request.setNewPassword("NewPass123!");
            request.setConfirmPassword("NewPass123!");

            doNothing().when(passwordResetService).resetPassword(anyString(), anyString(), anyString());

            mockMvc.perform(post("/auth/password/reset")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.message").value("Password reset successfully! You can now log in with your new password."));
        }
    }
}
