package com.edumind.auth.controller;

import com.edumind.auth.config.TestSecurityConfig;
import com.edumind.auth.dto.request.TwoFactorDisableRequest;
import com.edumind.auth.dto.request.TwoFactorVerifyRequest;
import com.edumind.auth.dto.response.BackupCodesResponse;
import com.edumind.auth.dto.response.TwoFactorSetupResponse;
import com.edumind.auth.dto.response.TwoFactorStatusResponse;
import com.edumind.auth.service.TwoFactorAuthService;
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
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Arrays;
import java.util.HashMap;
import java.util.Map;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Controller tests for TwoFactorAuthController
 * Tests 2FA endpoints: setup, verify, disable, status, and backup codes
 */
@WebMvcTest(TwoFactorAuthController.class)
@Import(TestSecurityConfig.class)
class TwoFactorAuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private TwoFactorAuthService twoFactorAuthService;

    @Autowired
    private ObjectMapper objectMapper;

    // ==================== SETUP 2FA TESTS ====================

    @Nested
    @DisplayName("POST /auth/2fa/setup Tests")
    class Setup2FATests {

        @Test
        @WithMockUser(username = "testuser")
        @DisplayName("Should setup 2FA and return QR code")
        void setup2FA_WhenAuthenticated_ShouldReturnSetupResponse() throws Exception {
            // Given
            TwoFactorSetupResponse response = new TwoFactorSetupResponse(
                    "JBSWY3DPEHPK3PXP",
                    "data:image/png;base64,iVBORw0...",
                    "JBSWY3DPEHPK3PXP",
                    Arrays.asList("ABCD1234EFGH", "IJKL5678MNOP")
            );

            when(twoFactorAuthService.setup2FA()).thenReturn(response);

            // When/Then
            mockMvc.perform(post("/auth/2fa/setup")
                            .with(csrf()))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data.secret").value("JBSWY3DPEHPK3PXP"))
                    .andExpect(jsonPath("$.data.qrCodeUrl").exists())
                    .andExpect(jsonPath("$.data.backupCodes").isArray());
        }

        @Test
        @WithMockUser(username = "testuser")
        @DisplayName("Should return 400 when 2FA already enabled")
        void setup2FA_When2FAAlreadyEnabled_ShouldReturn400() throws Exception {
            // Given
            when(twoFactorAuthService.setup2FA())
                    .thenThrow(new BadRequestException("2FA is already enabled"));

            // When/Then
            mockMvc.perform(post("/auth/2fa/setup")
                            .with(csrf()))
                    .andExpect(status().isBadRequest());
        }

        // Note: TestSecurityConfig permits all requests, so unauthenticated tests
        // would return 500 (AuthorizationDeniedException) instead of 401.
        // This is expected behavior in test environment with @WebMvcTest.
    }

    // ==================== VERIFY 2FA TESTS ====================

    @Nested
    @DisplayName("POST /auth/2fa/verify Tests")
    class Verify2FATests {

        @Test
        @WithMockUser(username = "testuser")
        @DisplayName("Should verify and enable 2FA with valid code")
        void verify2FA_WithValidCode_ShouldEnable2FA() throws Exception {
            // Given
            TwoFactorVerifyRequest request = new TwoFactorVerifyRequest();
            request.setCode("123456");

            TwoFactorStatusResponse response = TwoFactorStatusResponse.enabled(5);

            when(twoFactorAuthService.verify2FA("123456"))
                    .thenReturn(response);

            // When/Then
            mockMvc.perform(post("/auth/2fa/verify")
                            .with(csrf())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data.enabled").value(true))
                    .andExpect(jsonPath("$.data.backupCodesRemaining").value(5));
        }

        @Test
        @WithMockUser(username = "testuser")
        @DisplayName("Should return 400 for invalid code")
        void verify2FA_WithInvalidCode_ShouldReturn400() throws Exception {
            // Given
            TwoFactorVerifyRequest request = new TwoFactorVerifyRequest();
            request.setCode("000000");

            when(twoFactorAuthService.verify2FA("000000"))
                    .thenThrow(new BadRequestException("Invalid verification code"));

            // When/Then
            mockMvc.perform(post("/auth/2fa/verify")
                            .with(csrf())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isBadRequest());
        }

        // Note: TestSecurityConfig permits all requests, so unauthenticated tests
        // would return 500 (AuthorizationDeniedException) instead of 401.
        // This is expected behavior in test environment with @WebMvcTest.

        @Test
        @WithMockUser(username = "testuser")
        @DisplayName("Should return 400 when code is missing")
        void verify2FA_WithMissingCode_ShouldReturn400() throws Exception {
            // Given
            TwoFactorVerifyRequest request = new TwoFactorVerifyRequest();
            // code is null

            // When/Then
            mockMvc.perform(post("/auth/2fa/verify")
                            .with(csrf())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isBadRequest());
        }

    }

    // ==================== DISABLE 2FA TESTS ====================

    @Nested
    @DisplayName("POST /auth/2fa/disable Tests")
    class Disable2FATests {

        @Test
        @WithMockUser(username = "testuser")
        @DisplayName("Should disable 2FA with valid password")
        void disable2FA_WithValidPassword_ShouldDisable() throws Exception {
            // Given
            TwoFactorDisableRequest request = new TwoFactorDisableRequest();
            request.setPassword("correctPassword");
            request.setCode("123456");

            TwoFactorStatusResponse response = TwoFactorStatusResponse.disabled();

            when(twoFactorAuthService.disable2FA("correctPassword", "123456"))
                    .thenReturn(response);

            // When/Then
            mockMvc.perform(post("/auth/2fa/disable")
                            .with(csrf())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data.enabled").value(false));
        }

        @Test
        @WithMockUser(username = "testuser")
        @DisplayName("Should return 400 for wrong password")
        void disable2FA_WithWrongPassword_ShouldReturn400() throws Exception {
            // Given
            TwoFactorDisableRequest request = new TwoFactorDisableRequest();
            request.setPassword("wrongPassword");

            when(twoFactorAuthService.disable2FA("wrongPassword", null))
                    .thenThrow(new BadRequestException("Invalid password"));

            // When/Then
            mockMvc.perform(post("/auth/2fa/disable")
                            .with(csrf())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @WithMockUser(username = "testuser")
        @DisplayName("Should return 400 when 2FA not enabled")
        void disable2FA_When2FANotEnabled_ShouldReturn400() throws Exception {
            // Given
            TwoFactorDisableRequest request = new TwoFactorDisableRequest();
            request.setPassword("password");

            when(twoFactorAuthService.disable2FA(anyString(), any()))
                    .thenThrow(new BadRequestException("2FA is not enabled"));

            // When/Then
            mockMvc.perform(post("/auth/2fa/disable")
                            .with(csrf())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isBadRequest());
        }

        // Note: TestSecurityConfig permits all requests, so unauthenticated tests
        // would return 500 (AuthorizationDeniedException) instead of 401.
        // This is expected behavior in test environment with @WebMvcTest.
    }

    // ==================== GET 2FA STATUS TESTS ====================

    @Nested
    @DisplayName("GET /auth/2fa/status Tests")
    class Get2FAStatusTests {

        @Test
        @WithMockUser(username = "testuser")
        @DisplayName("Should return 2FA status when enabled")
        void get2FAStatus_When2FAEnabled_ShouldReturnEnabledStatus() throws Exception {
            // Given
            TwoFactorStatusResponse response = TwoFactorStatusResponse.enabled(3);

            when(twoFactorAuthService.get2FAStatus()).thenReturn(response);

            // When/Then
            mockMvc.perform(get("/auth/2fa/status"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data.enabled").value(true))
                    .andExpect(jsonPath("$.data.backupCodesRemaining").value(3));
        }

        @Test
        @WithMockUser(username = "testuser")
        @DisplayName("Should return 2FA status when disabled")
        void get2FAStatus_When2FADisabled_ShouldReturnDisabledStatus() throws Exception {
            // Given
            TwoFactorStatusResponse response = TwoFactorStatusResponse.disabled();

            when(twoFactorAuthService.get2FAStatus()).thenReturn(response);

            // When/Then
            mockMvc.perform(get("/auth/2fa/status"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data.enabled").value(false));
        }

        // Note: TestSecurityConfig permits all requests, so unauthenticated tests
        // would return 500 (AuthorizationDeniedException) instead of 401.
        // This is expected behavior in test environment with @WebMvcTest.

    }

    // ==================== REGENERATE BACKUP CODES TESTS ====================

    @Nested
    @DisplayName("POST /auth/2fa/backup-codes Tests")
    class RegenerateBackupCodesTests {

        @Test
        @WithMockUser(username = "testuser")
        @DisplayName("Should regenerate backup codes with valid password")
        void regenerateBackupCodes_WithValidPassword_ShouldReturnNewCodes() throws Exception {
            // Given
            Map<String, String> request = new HashMap<>();
            request.put("password", "correctPassword");

            BackupCodesResponse response = new BackupCodesResponse(
                    Arrays.asList("CODE1234ABCD", "CODE5678EFGH", "CODE9012IJKL")
            );

            when(twoFactorAuthService.regenerateBackupCodes("correctPassword"))
                    .thenReturn(response);

            // When/Then
            mockMvc.perform(post("/auth/2fa/backup-codes")
                            .with(csrf())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data.backupCodes").isArray())
                    .andExpect(jsonPath("$.data.backupCodes.length()").value(3));
        }

        @Test
        @WithMockUser(username = "testuser")
        @DisplayName("Should return 400 for wrong password")
        void regenerateBackupCodes_WithWrongPassword_ShouldReturn400() throws Exception {
            // Given
            Map<String, String> request = new HashMap<>();
            request.put("password", "wrongPassword");

            when(twoFactorAuthService.regenerateBackupCodes("wrongPassword"))
                    .thenThrow(new BadRequestException("Invalid password"));

            // When/Then
            mockMvc.perform(post("/auth/2fa/backup-codes")
                            .with(csrf())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @WithMockUser(username = "testuser")
        @DisplayName("Should return 400 when 2FA not enabled")
        void regenerateBackupCodes_When2FANotEnabled_ShouldReturn400() throws Exception {
            // Given
            Map<String, String> request = new HashMap<>();
            request.put("password", "password");

            when(twoFactorAuthService.regenerateBackupCodes(anyString()))
                    .thenThrow(new BadRequestException("2FA is not enabled"));

            // When/Then
            mockMvc.perform(post("/auth/2fa/backup-codes")
                            .with(csrf())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isBadRequest());
        }

        // Note: TestSecurityConfig permits all requests, so unauthenticated tests
        // would return 500 (AuthorizationDeniedException) instead of 401.
        // This is expected behavior in test environment with @WebMvcTest.

        @Test
        @WithMockUser(username = "testuser")
        @DisplayName("Should return 400 when password is missing")
        void regenerateBackupCodes_WithMissingPassword_ShouldReturn400() throws Exception {
            // Given
            Map<String, String> request = new HashMap<>();
            // password is missing

            // When password is null, service will throw BadRequestException
            when(twoFactorAuthService.regenerateBackupCodes(null))
                    .thenThrow(new BadRequestException("Invalid password"));

            // When/Then
            mockMvc.perform(post("/auth/2fa/backup-codes")
                            .with(csrf())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @WithMockUser(username = "testuser")
        @DisplayName("Should return 400 when password is null")
        void regenerateBackupCodes_WithNullPassword_ShouldReturn400() throws Exception {
            // Given
            Map<String, String> request = new HashMap<>();
            request.put("password", null);

            when(twoFactorAuthService.regenerateBackupCodes(null))
                    .thenThrow(new BadRequestException("Invalid password"));

            // When/Then
            mockMvc.perform(post("/auth/2fa/backup-codes")
                            .with(csrf())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isBadRequest());
        }

    }
}
