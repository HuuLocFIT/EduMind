package com.edumind.auth.integration;

import com.edumind.auth.dto.request.LoginRequest;
import com.edumind.auth.dto.request.SignupRequest;
import com.edumind.auth.entity.Role;
import com.edumind.auth.entity.User;
import com.edumind.auth.enums.AuthProvider;
import com.edumind.auth.enums.RoleName;
import com.edumind.auth.repository.RoleRepository;
import com.edumind.auth.repository.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Integration tests for Auth functionality
 * Uses @SpringBootTest to load full application context with H2 database
 */
@SpringBootTest
@AutoConfigureMockMvc
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.ANY)
@ActiveProfiles("test")
@Transactional
class AuthIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        // Ensure required roles exist
        if (roleRepository.findByName(RoleName.ROLE_STUDENT).isEmpty()) {
            Role studentRole = Role.builder()
                    .name(RoleName.ROLE_STUDENT)
                    .description("Student role")
                    .build();
            roleRepository.save(studentRole);
        }

        if (roleRepository.findByName(RoleName.ROLE_ADMIN).isEmpty()) {
            Role adminRole = Role.builder()
                    .name(RoleName.ROLE_ADMIN)
                    .description("Admin role")
                    .build();
            roleRepository.save(adminRole);
        }
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
            request.setFirstName("Integration");
            request.setLastName("Test");

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
            assertEquals("Integration", savedUser.get().getFirstName());
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
            createTestUser("existinguser", "existing@example.com");

            SignupRequest request = new SignupRequest();
            request.setUsername("newuser");
            request.setEmail("existing@example.com"); // Same email
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

    // ==================== FULL FLOW INTEGRATION TEST ====================

    @Test
    @DisplayName("Full registration and login flow")
    void fullAuthenticationFlow() throws Exception {
        // 1. Register
        SignupRequest signupRequest = new SignupRequest();
        signupRequest.setUsername("fullflowuser");
        signupRequest.setEmail("fullflow@example.com");
        signupRequest.setPassword("Password123!");
        signupRequest.setFirstName("Full");
        signupRequest.setLastName("Flow");

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
        Role studentRole = roleRepository.findByName(RoleName.ROLE_STUDENT).get();

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
                .roles(Set.of(studentRole))
                .build();

        return userRepository.save(user);
    }
}
