package com.edumind.auth.integration;

import com.edumind.auth.config.BaseIntegrationTest;
import com.edumind.auth.dto.request.LoginRequest;
import com.edumind.auth.dto.request.PasswordResetConfirmRequest;
import com.edumind.auth.dto.request.SignupRequest;
import com.edumind.auth.entity.PasswordResetToken;
import com.edumind.auth.entity.Role;
import com.edumind.auth.entity.User;
import com.edumind.auth.entity.EmailVerificationToken;
import com.edumind.auth.enums.AuthProvider;
import com.edumind.auth.enums.RoleName;
import com.edumind.auth.repository.RoleRepository;
import com.edumind.auth.repository.UserRepository;
import com.edumind.auth.repository.EmailVerificationTokenRepository;
import com.edumind.auth.repository.PasswordResetTokenRepository;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MvcResult;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Integration tests for Auth functionality.
 * Uses Testcontainers with real PostgreSQL.
 * Default roles are available via Flyway migrations.
 */
class AuthIntegrationTest extends BaseIntegrationTest {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private EmailVerificationTokenRepository emailVerificationTokenRepository;

    @Autowired
    private PasswordResetTokenRepository passwordResetTokenRepository;

    @BeforeEach
    void setUp() {
        // Roles are already created via Flyway migrations (V5__Insert_default_roles.sql)
        // No need to manually create roles
    }

    // ==================== REGISTRATION INTEGRATION TESTS ====================

    @Nested
    @DisplayName("Registration Integration Tests")
    class RegistrationIntegrationTests {

        @Test
        @DisplayName("Should register user and persist to database")
        void fullRegistrationFlow_ShouldPersistUser() throws Exception {
            // Given
            SignupRequest request = new SignupRequest();
            request.setUsername("integrationuser");
            request.setEmail("integration@example.com");
            request.setPassword("Password123!");

            // When
            mockMvc.perform(post("/auth/signup")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.success").value(true));

            // Then - Verify user was persisted
            Optional<User> savedUser = userRepository.findByUsername("integrationuser");
            assertTrue(savedUser.isPresent());
            assertEquals("integration@example.com", savedUser.get().getEmail());
            assertFalse(savedUser.get().getIsEmailVerified()); // Should not be verified yet
            assertTrue(savedUser.get().getRoles().stream()
                    .anyMatch(role -> role.getName() == RoleName.ROLE_STUDENT));
        }

        @Test
        @DisplayName("Should reject duplicate username")
        void registration_WithDuplicateUsername_ShouldFail() throws Exception {
            // Given - Create existing user
            createTestUser("existinguser", "existing@example.com");

            SignupRequest request = new SignupRequest();
            request.setUsername("existinguser"); // Same username
            request.setEmail("different@example.com");
            request.setPassword("Password123!");

            // When/Then
            mockMvc.perform(post("/auth/signup")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("Should reject duplicate email")
        void registration_WithDuplicateEmail_ShouldFail() throws Exception {
            // Given - Create existing user
            createTestUser("existinguser2", "existing2@example.com");

            SignupRequest request = new SignupRequest();
            request.setUsername("newuser");
            request.setEmail("existing2@example.com"); // Same email
            request.setPassword("Password123!");

            // When/Then
            mockMvc.perform(post("/auth/signup")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isBadRequest());
        }
    }

    // ==================== LOGIN INTEGRATION TESTS ====================

    @Nested
    @DisplayName("Login Integration Tests")
    class LoginIntegrationTests {

        @Test
        @DisplayName("Should login with correct credentials")
        void login_WithCorrectCredentials_ShouldReturnJwt() throws Exception {
            // Given - Create verified user
            User user = createTestUser("loginuser", "login@example.com");
            user.setIsEmailVerified(true);
            userRepository.save(user);

            LoginRequest request = new LoginRequest("loginuser", "Password123!");

            // When/Then
            mockMvc.perform(post("/auth/login")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data.accessToken").exists())
                    .andExpect(jsonPath("$.data.tokenType").value("Bearer"))
                    .andExpect(jsonPath("$.data.user.username").value("loginuser"));
        }

        @Test
        @DisplayName("Should login with email instead of username")
        void login_WithEmail_ShouldReturnJwt() throws Exception {
            // Given - Create verified user
            User user = createTestUser("emaillogin", "emaillogin@example.com");
            user.setIsEmailVerified(true);
            userRepository.save(user);

            LoginRequest request = new LoginRequest("emaillogin@example.com", "Password123!");

            // When/Then
            mockMvc.perform(post("/auth/login")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.accessToken").exists());
        }

        @Test
        @DisplayName("Should reject wrong password")
        void login_WithWrongPassword_ShouldFail() throws Exception {
            // Given - Create verified user
            User user = createTestUser("wrongpassuser", "wrongpass@example.com");
            user.setIsEmailVerified(true);
            userRepository.save(user);

            LoginRequest request = new LoginRequest("wrongpassuser", "WrongPassword!");

            // When/Then
            mockMvc.perform(post("/auth/login")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isUnauthorized());
        }

        @Test
        @DisplayName("Should reject login for non-existent user")
        void login_WithNonExistentUser_ShouldFail() throws Exception {
            LoginRequest request = new LoginRequest("nonexistent", "Password123!");

            // When/Then
            mockMvc.perform(post("/auth/login")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isUnauthorized());
        }
    }

    @Nested
    @DisplayName("Refresh Token Invariant Tests")
    class RefreshTokenInvariantTests {

        @Test
        @DisplayName("POST /auth/refresh does not emit a new Set-Cookie")
        void refresh_ShouldNotRotateCookie() throws Exception {
            User user = createTestUser("refreshnocookie", "refreshnocookie@example.com");
            user.setIsEmailVerified(true);
            userRepository.save(user);

            LoginRequest login = new LoginRequest("refreshnocookie", "Password123!");
            MvcResult loginResult = mockMvc.perform(post("/auth/login")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(login)))
                    .andExpect(status().isOk())
                    .andReturn();

            Cookie refreshCookie = loginResult.getResponse().getCookie("refreshToken");
            assertNotNull(refreshCookie);

            // Two user-portal and admin-portal frontends share this single refresh-token
            // cookie. If /auth/refresh rotated it, reconciling one portal would silently
            // invalidate the other portal's still-valid session.
            mockMvc.perform(post("/auth/refresh").cookie(refreshCookie))
                    .andExpect(status().isOk())
                    .andExpect(header().doesNotExist("Set-Cookie"));
        }

        @Test
        @DisplayName("POST /auth/refresh does not revoke the refresh token being used")
        void refresh_ShouldNotRevokeTokenUsed() throws Exception {
            User user = createTestUser("refreshnorevoke", "refreshnorevoke@example.com");
            user.setIsEmailVerified(true);
            userRepository.save(user);

            LoginRequest login = new LoginRequest("refreshnorevoke", "Password123!");
            MvcResult loginResult = mockMvc.perform(post("/auth/login")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(login)))
                    .andExpect(status().isOk())
                    .andReturn();

            Cookie refreshCookie = loginResult.getResponse().getCookie("refreshToken");
            assertNotNull(refreshCookie);

            mockMvc.perform(post("/auth/refresh").cookie(refreshCookie))
                    .andExpect(status().isOk());

            // Same cookie must still work on a subsequent reconcile - proves the first
            // refresh call did not revoke the token it consumed.
            mockMvc.perform(post("/auth/refresh").cookie(refreshCookie))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.user.username").value("refreshnorevoke"));
        }
    }

    @Nested
    @DisplayName("Password Reset Session Revocation Tests")
    class PasswordResetSessionRevocationTests {

        @Test
        @DisplayName("Resetting password rejects a refresh cookie issued before the reset")
        void resetPassword_WithExistingRefreshCookie_ShouldRejectOldCookie() throws Exception {
            User user = createTestUser("resetrefreshuser", "resetrefresh@example.com");
            user.setIsEmailVerified(true);
            userRepository.save(user);

            LoginRequest login = new LoginRequest("resetrefreshuser", "Password123!");
            MvcResult loginResult = mockMvc.perform(post("/auth/login")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(login)))
                    .andExpect(status().isOk())
                    .andReturn();

            Cookie oldRefreshCookie = loginResult.getResponse().getCookie("refreshToken");
            assertNotNull(oldRefreshCookie);

            PasswordResetToken resetToken = new PasswordResetToken();
            resetToken.setToken("integration-reset-token");
            resetToken.setUser(user);
            resetToken.setExpiryDate(LocalDateTime.now().plusHours(1));
            resetToken.setUsed(false);
            passwordResetTokenRepository.save(resetToken);

            PasswordResetConfirmRequest resetRequest = new PasswordResetConfirmRequest(
                    resetToken.getToken(), "ChangedPassword123!", "ChangedPassword123!");
            mockMvc.perform(post("/auth/password/reset")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(resetRequest)))
                    .andExpect(status().isOk());

            // Revoked refresh tokens are rejected via TokenRefreshException, which
            // GlobalExceptionHandler maps to 403 (consistent with expired/not-found tokens).
            mockMvc.perform(post("/auth/refresh").cookie(oldRefreshCookie))
                    .andExpect(status().isForbidden());
        }
    }

    @Nested
    @DisplayName("Email Verification Enforcement Tests")
    class EmailVerificationEnforcementTests {

        @Test
        @DisplayName("Unverified login returns the frontend error contract")
        void login_WithUnverifiedEmail_ShouldReturn403WithErrorCode() throws Exception {
            createTestUser("unverifieduser", "unverified@example.com");
            LoginRequest request = new LoginRequest("unverifieduser", "Password123!");

            mockMvc.perform(post("/auth/login")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.errorCode").value("ERR_5004"))
                    .andExpect(jsonPath("$.message")
                            .value("Please verify your email before signing in."));
        }

        @Test
        @DisplayName("User can login after following the verification token")
        void login_AfterVerifyingEmail_ShouldSucceed() throws Exception {
            SignupRequest signup = new SignupRequest();
            signup.setUsername("verificationflow");
            signup.setEmail("verificationflow@example.com");
            signup.setPassword("Password123!");

            mockMvc.perform(post("/auth/signup")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(signup)))
                    .andExpect(status().isCreated());

            User user = userRepository.findByUsername("verificationflow").orElseThrow();
            EmailVerificationToken token = emailVerificationTokenRepository.findAll().stream()
                    .filter(candidate -> candidate.getUser().getId().equals(user.getId()))
                    .findFirst()
                    .orElseThrow();

            mockMvc.perform(get("/auth/verify-email").param("token", token.getToken()))
                    .andExpect(status().isOk());

            LoginRequest login = new LoginRequest("verificationflow", "Password123!");
            mockMvc.perform(post("/auth/login")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(login)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.accessToken").exists());
        }
    }

    // ==================== FULL FLOW INTEGRATION TEST ====================

    @Test
    @DisplayName("Full registration and login flow")
    void fullAuthenticationFlow() throws Exception {
        // 1. Register
        SignupRequest signupRequest = new SignupRequest();
        signupRequest.setUsername("fullflowuser");
        signupRequest.setEmail("fullflow@example.com");
        signupRequest.setPassword("Password123!");

        mockMvc.perform(post("/auth/signup")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(signupRequest)))
                .andExpect(status().isCreated());

        // 2. Verify user was created in database
        Optional<User> createdUserOpt = userRepository.findByUsername("fullflowuser");
        assertTrue(createdUserOpt.isPresent());
        User createdUser = createdUserOpt.get();

        // 3. Simulate email verification (normally done via email link)
        createdUser.setIsEmailVerified(true);
        userRepository.save(createdUser);

        // 4. Login with created user
        LoginRequest loginRequest = new LoginRequest("fullflowuser", "Password123!");

        mockMvc.perform(post("/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(loginRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.accessToken").exists())
                .andExpect(jsonPath("$.data.user.email").value("fullflow@example.com"));

        // 5. Verify last login was updated
        User updatedUser = userRepository.findByUsername("fullflowuser").get();
        assertNotNull(updatedUser.getLastLoginAt());
    }

    // ==================== HELPER METHODS ====================

    private User createTestUser(String username, String email) {
        Role studentRole = roleRepository.findByName(RoleName.ROLE_STUDENT)
                .orElseThrow(() -> new IllegalStateException("ROLE_STUDENT not found - check Flyway migrations"));

        User user = User.builder()
                .username(username)
                .email(email)
                .password(passwordEncoder.encode("Password123!"))
                .firstName("Test")
                .lastName("User")
                .isActive(true)
                .isEmailVerified(false)
                .is2faEnabled(false)
                .provider(AuthProvider.LOCAL)
                .roles(new java.util.HashSet<>(Set.of(studentRole)))
                .build();

        return userRepository.save(user);
    }
}
