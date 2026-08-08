package com.edumind.auth.controller;

import com.edumind.auth.config.TestSecurityConfig;
import com.edumind.auth.dto.request.LoginRequest;
import com.edumind.auth.dto.request.SignupRequest;
import com.edumind.auth.dto.request.TwoFactorLoginRequest;
import com.edumind.auth.dto.response.JwtResponse;
import com.edumind.auth.dto.response.TwoFactorRequiredResponse;
import com.edumind.auth.dto.response.UserResponse;
import com.edumind.auth.service.AuthService;
import com.edumind.common.constants.ResponseStatus;
import com.edumind.common.exception.BadRequestException;
import com.edumind.common.exception.TokenRefreshException;
import com.edumind.common.response.MessageResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.Cookie;
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

import java.util.Set;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Controller tests for AuthController
 * Uses @WebMvcTest to test only the web layer with mocked service
 */
@WebMvcTest(AuthController.class)
@Import(TestSecurityConfig.class)
class AuthControllerTest {

        @Autowired
        private MockMvc mockMvc;

        @MockBean
        private AuthService authService;

        @Autowired
        private ObjectMapper objectMapper;

        // ==================== SIGNUP TESTS ====================

        @Nested
        @DisplayName("POST /auth/signup Tests")
        class SignupTests {

                @Test
                @DisplayName("Should register user with valid data and return 201")
                void signup_WithValidData_Returns201() throws Exception {
                        SignupRequest request = new SignupRequest();
                        request.setUsername("newuser");
                        request.setEmail("newuser@example.com");
                        request.setPassword("Password123!");

                        when(authService.registerUser(any(SignupRequest.class)))
                                        .thenReturn(MessageResponse.builder()
                                                        .status(201)
                                                        .success(true)
                                                        .message(ResponseStatus.REGISTER_SUCCESS)
                                                        .build());

                        mockMvc.perform(post("/auth/signup")
                                        .with(csrf())
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content(objectMapper.writeValueAsString(request)))
                                        .andExpect(status().isCreated())
                                        .andExpect(jsonPath("$.success").value(true))
                                        .andExpect(jsonPath("$.status").value(201));
                }

                @Test
                @DisplayName("Should return 400 when username is blank")
                void signup_WithBlankUsername_Returns400() throws Exception {
                        SignupRequest request = new SignupRequest();
                        request.setUsername("");
                        request.setEmail("newuser@example.com");
                        request.setPassword("Password123!");

                        mockMvc.perform(post("/auth/signup")
                                        .with(csrf())
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content(objectMapper.writeValueAsString(request)))
                                        .andExpect(status().isBadRequest());
                }

                @Test
                @DisplayName("Should return 400 when email is invalid")
                void signup_WithInvalidEmail_Returns400() throws Exception {
                        SignupRequest request = new SignupRequest();
                        request.setUsername("newuser");
                        request.setEmail("invalid-email");
                        request.setPassword("Password123!");

                        mockMvc.perform(post("/auth/signup")
                                        .with(csrf())
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content(objectMapper.writeValueAsString(request)))
                                        .andExpect(status().isBadRequest());
                }

                @Test
                @DisplayName("Should return 400 when password is too short")
                void signup_WithShortPassword_Returns400() throws Exception {
                        SignupRequest request = new SignupRequest();
                        request.setUsername("newuser");
                        request.setEmail("newuser@example.com");
                        request.setPassword("short");

                        mockMvc.perform(post("/auth/signup")
                                        .with(csrf())
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content(objectMapper.writeValueAsString(request)))
                                        .andExpect(status().isBadRequest());
                }

                @Test
                @DisplayName("Should return 400 when username already exists")
                void signup_WithExistingUsername_Returns400() throws Exception {
                        SignupRequest request = new SignupRequest();
                        request.setUsername("existinguser");
                        request.setEmail("newuser@example.com");
                        request.setPassword("Password123!");

                        doThrow(new BadRequestException("Username is already taken!"))
                                        .when(authService).registerUser(any(SignupRequest.class));

                        mockMvc.perform(post("/auth/signup")
                                        .with(csrf())
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content(objectMapper.writeValueAsString(request)))
                                        .andExpect(status().isBadRequest());
                }
        }

        // ==================== LOGIN TESTS ====================

        @Nested
        @DisplayName("POST /auth/login Tests")
        class LoginTests {

                @Test
                @DisplayName("Should login successfully and return JWT")
                void login_WithValidCredentials_ReturnsJwt() throws Exception {
                        LoginRequest request = new LoginRequest("testuser", "password123");

                        UserResponse userResponse = UserResponse.builder()
                                        .id(1L)
                                        .username("testuser")
                                        .email("test@example.com")
                                        .roles(Set.of("ROLE_STUDENT"))
                                        .build();

                        JwtResponse jwtResponse = JwtResponse.builder()
                                        .accessToken("mock-access-token")
                                        .tokenType("Bearer")
                                        .user(userResponse)
                                        .build();

                        when(authService.authenticateUser(any(LoginRequest.class), any()))
                                        .thenReturn(jwtResponse);

                        mockMvc.perform(post("/auth/login")
                                        .with(csrf())
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content(objectMapper.writeValueAsString(request)))
                                        .andExpect(status().isOk())
                                        .andExpect(jsonPath("$.success").value(true))
                                        .andExpect(jsonPath("$.data.accessToken").value("mock-access-token"))
                                        .andExpect(jsonPath("$.data.tokenType").value("Bearer"));
                }

                @Test
                @DisplayName("Should return 2FA required response when 2FA enabled")
                void login_With2FAEnabled_ReturnsTwoFactorRequired() throws Exception {
                        LoginRequest request = new LoginRequest("testuser", "password123");

                        TwoFactorRequiredResponse twoFactorResponse = new TwoFactorRequiredResponse(
                                        "test@example.com",
                                        "Two-factor authentication required");

                        when(authService.authenticateUser(any(LoginRequest.class), any()))
                                        .thenReturn(twoFactorResponse);

                        mockMvc.perform(post("/auth/login")
                                        .with(csrf())
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content(objectMapper.writeValueAsString(request)))
                                        .andExpect(status().isOk())
                                        .andExpect(jsonPath("$.data.requires2FA").value(true))
                                        .andExpect(jsonPath("$.data.email").value("test@example.com"));
                }

                @Test
                @DisplayName("Should return 400 when credentials are blank")
                void login_WithBlankCredentials_Returns400() throws Exception {
                        LoginRequest request = new LoginRequest("", "");

                        mockMvc.perform(post("/auth/login")
                                        .with(csrf())
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content(objectMapper.writeValueAsString(request)))
                                        .andExpect(status().isBadRequest());
                }
        }

        // ==================== 2FA LOGIN TESTS ====================

        @Nested
        @DisplayName("POST /auth/login/2fa Tests")
        class TwoFactorLoginTests {

                @Test
                @DisplayName("Should complete 2FA login and return JWT")
                void verify2FA_WithValidCode_ReturnsJwt() throws Exception {
                        TwoFactorLoginRequest request = new TwoFactorLoginRequest();
                        request.setUsernameOrEmail("test@example.com");
                        request.setCode("123456");

                        UserResponse userResponse = UserResponse.builder()
                                        .id(1L)
                                        .username("testuser")
                                        .email("test@example.com")
                                        .build();

                        JwtResponse jwtResponse = JwtResponse.builder()
                                        .accessToken("mock-access-token")
                                        .tokenType("Bearer")
                                        .user(userResponse)
                                        .build();

                        when(authService.verify2FAAndLogin(any(TwoFactorLoginRequest.class), any()))
                                        .thenReturn(jwtResponse);

                        mockMvc.perform(post("/auth/login/2fa")
                                        .with(csrf())
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content(objectMapper.writeValueAsString(request)))
                                        .andExpect(status().isOk())
                                        .andExpect(jsonPath("$.data.accessToken").value("mock-access-token"));
                }

                @Test
                @DisplayName("Should return 400 when 2FA code is invalid")
                void verify2FA_WithInvalidCode_Returns400() throws Exception {
                        TwoFactorLoginRequest request = new TwoFactorLoginRequest();
                        request.setUsernameOrEmail("test@example.com");
                        request.setCode("000000");

                        when(authService.verify2FAAndLogin(any(TwoFactorLoginRequest.class), any()))
                                        .thenThrow(new BadRequestException("Invalid 2FA code"));

                        mockMvc.perform(post("/auth/login/2fa")
                                        .with(csrf())
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content(objectMapper.writeValueAsString(request)))
                                        .andExpect(status().isBadRequest());
                }
        }

        // ==================== REFRESH TOKEN TESTS ====================

        @Nested
        @DisplayName("POST /auth/refresh Tests")
        class RefreshTokenTests {

                @Test
                @DisplayName("Should refresh token with valid cookie")
                void refreshToken_WithValidCookie_ReturnsNewJwt() throws Exception {
                        UserResponse userResponse = UserResponse.builder()
                                        .id(1L)
                                        .username("testuser")
                                        .email("test@example.com")
                                        .build();

                        JwtResponse jwtResponse = JwtResponse.builder()
                                        .accessToken("new-access-token")
                                        .tokenType("Bearer")
                                        .user(userResponse)
                                        .build();

                        when(authService.refreshToken(eq("valid-refresh-token"), any()))
                                        .thenReturn(jwtResponse);

                        mockMvc.perform(post("/auth/refresh")
                                        .with(csrf())
                                        .cookie(new Cookie("refreshToken", "valid-refresh-token")))
                                        .andExpect(status().isOk())
                                        .andExpect(jsonPath("$.data.accessToken").value("new-access-token"));
                }

                @Test
                @DisplayName("Should return 401 when refresh token expired")
                void refreshToken_WithExpiredToken_Returns401() throws Exception {
                        when(authService.refreshToken(eq("expired-token"), any()))
                                        .thenThrow(new TokenRefreshException("Refresh token is expired!"));

                        mockMvc.perform(post("/auth/refresh")
                                        .with(csrf())
                                        .cookie(new Cookie("refreshToken", "expired-token")))
                                        .andExpect(status().isForbidden());
                }
        }

        // ==================== LOGOUT TESTS ====================

        @Nested
        @DisplayName("POST /auth/logout Tests")
        class LogoutTests {

                @Test
                @WithMockUser(username = "testuser")
                @DisplayName("Should logout successfully")
                void logout_WhenAuthenticated_ReturnsSuccess() throws Exception {
                        when(authService.logout(any()))
                                        .thenReturn(MessageResponse.builder()
                                                        .status(200)
                                                        .success(true)
                                                        .message(ResponseStatus.LOGOUT_SUCCESS)
                                                        .build());

                        mockMvc.perform(post("/auth/logout")
                                        .with(csrf()))
                                        .andExpect(status().isOk())
                                        .andExpect(jsonPath("$.success").value(true));
                }
        }
}
