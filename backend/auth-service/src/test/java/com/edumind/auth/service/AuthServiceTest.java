package com.edumind.auth.service;

import com.edumind.auth.dto.request.LoginRequest;
import com.edumind.auth.dto.request.SignupRequest;
import com.edumind.auth.dto.request.TwoFactorLoginRequest;
import com.edumind.auth.dto.response.JwtResponse;
import com.edumind.auth.dto.response.TwoFactorRequiredResponse;
import com.edumind.auth.entity.RefreshToken;
import com.edumind.auth.entity.Role;
import com.edumind.auth.entity.User;
import com.edumind.auth.enums.AuthProvider;
import com.edumind.auth.enums.RoleName;
import com.edumind.auth.repository.RefreshTokenRepository;
import com.edumind.auth.repository.RoleRepository;
import com.edumind.auth.repository.UserRepository;
import com.edumind.auth.security.JwtTokenProvider;
import com.edumind.auth.security.UserDetailsImpl;
import com.edumind.common.exception.BadRequestException;
import com.edumind.common.exception.TokenRefreshException;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

/**
 * Unit tests for AuthService
 * Tests authentication, registration, token refresh, and logout functionality
 */
@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private RoleRepository roleRepository;

    @Mock
    private RefreshTokenRepository refreshTokenRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private AuthenticationManager authenticationManager;

    @Mock
    private JwtTokenProvider tokenProvider;

    @Mock
    private EmailVerificationService emailVerificationService;

    @Mock
    private TwoFactorAuthService twoFactorAuthService;

    @Mock
    private HttpServletResponse httpServletResponse;

    @InjectMocks
    private AuthService authService;

    private User testUser;
    private Role studentRole;

    @BeforeEach
    void setUp() {
        // Manually inject mocks since AuthService uses mixed constructor/field injection
        // @InjectMocks can't handle this pattern properly
        ReflectionTestUtils.setField(authService, "userRepository", userRepository);
        ReflectionTestUtils.setField(authService, "roleRepository", roleRepository);
        ReflectionTestUtils.setField(authService, "refreshTokenRepository", refreshTokenRepository);
        ReflectionTestUtils.setField(authService, "passwordEncoder", passwordEncoder);
        ReflectionTestUtils.setField(authService, "tokenProvider", tokenProvider);
        ReflectionTestUtils.setField(authService, "emailVerificationService", emailVerificationService);
        ReflectionTestUtils.setField(authService, "twoFactorAuthService", twoFactorAuthService);
        
        // Set up required @Value fields
        ReflectionTestUtils.setField(authService, "refreshExpirationMs", 604800000L);
        ReflectionTestUtils.setField(authService, "cookieSecure", false);
        ReflectionTestUtils.setField(authService, "cookieSameSite", "Lax");

        // Create test user
        testUser = User.builder()
                .id(1L)
                .username("testuser")
                .email("test@example.com")
                .password("encodedPassword")
                .firstName("Test")
                .lastName("User")
                .isActive(true)
                .isEmailVerified(true)
                .is2faEnabled(false)
                .provider(AuthProvider.LOCAL)
                .build();

        // Create student role
        studentRole = new Role();
        studentRole.setId(1L);
        studentRole.setName(RoleName.ROLE_STUDENT);
    }

    // ==================== REGISTRATION TESTS ====================

    @Nested
    @DisplayName("registerUser Tests")
    class RegisterUserTests {

        @Test
        @DisplayName("Should register user successfully with valid data")
        void registerUser_WithValidData_ShouldCreateUser() {
            // Given
            SignupRequest request = createSignupRequest();

            when(userRepository.existsByUsername("newuser")).thenReturn(false);
            when(userRepository.existsByEmail("newuser@example.com")).thenReturn(false);
            when(passwordEncoder.encode("Password123!")).thenReturn("encodedPassword");
            when(roleRepository.findByName(RoleName.ROLE_STUDENT)).thenReturn(Optional.of(studentRole));
            when(userRepository.save(any(User.class))).thenAnswer(inv -> {
                User user = inv.getArgument(0);
                user.setId(1L);
                return user;
            });

            // When
            authService.registerUser(request);

            // Then
            verify(userRepository).save(any(User.class));
            verify(emailVerificationService).sendVerificationEmail(any(User.class));
        }

        @Test
        @DisplayName("Should throw exception when username already exists")
        void registerUser_WithExistingUsername_ShouldThrowException() {
            // Given
            SignupRequest request = createSignupRequest();
            when(userRepository.existsByUsername("newuser")).thenReturn(true);

            // When/Then
            BadRequestException exception = assertThrows(BadRequestException.class,
                    () -> authService.registerUser(request));

            assertEquals("Username is already taken!", exception.getMessage());
            verify(userRepository, never()).save(any(User.class));
        }

        @Test
        @DisplayName("Should throw exception when email already exists")
        void registerUser_WithExistingEmail_ShouldThrowException() {
            // Given
            SignupRequest request = createSignupRequest();
            when(userRepository.existsByUsername("newuser")).thenReturn(false);
            when(userRepository.existsByEmail("newuser@example.com")).thenReturn(true);

            // When/Then
            BadRequestException exception = assertThrows(BadRequestException.class,
                    () -> authService.registerUser(request));

            assertEquals("Email is already in use!", exception.getMessage());
            verify(userRepository, never()).save(any(User.class));
        }

        @Test
        @DisplayName("Should continue registration even if email sending fails")
        void registerUser_WhenEmailFails_ShouldStillComplete() {
            // Given
            SignupRequest request = createSignupRequest();

            when(userRepository.existsByUsername("newuser")).thenReturn(false);
            when(userRepository.existsByEmail("newuser@example.com")).thenReturn(false);
            when(passwordEncoder.encode(anyString())).thenReturn("encodedPassword");
            when(roleRepository.findByName(RoleName.ROLE_STUDENT)).thenReturn(Optional.of(studentRole));
            when(userRepository.save(any(User.class))).thenAnswer(inv -> {
                User user = inv.getArgument(0);
                user.setId(1L);
                return user;
            });
            doThrow(new RuntimeException("Email service down"))
                    .when(emailVerificationService).sendVerificationEmail(any(User.class));

            // When - Should not throw exception
            assertDoesNotThrow(() -> authService.registerUser(request));

            // Then - User should still be saved
            verify(userRepository).save(any(User.class));
        }
    }

    // ==================== AUTHENTICATION TESTS ====================

    @Nested
    @DisplayName("authenticateUser Tests")
    class AuthenticateUserTests {

        @Test
        @DisplayName("Should authenticate user and return JWT when 2FA disabled")
        void authenticateUser_Without2FA_ShouldReturnJwtResponse() {
            // Given
            LoginRequest request = new LoginRequest("testuser", "password123");
            testUser.setIs2faEnabled(false);

            Authentication mockAuth = createMockAuthentication();

            when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class)))
                    .thenReturn(mockAuth);
            when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));
            when(tokenProvider.generateAccessToken(any())).thenReturn("access-token");
            when(tokenProvider.generateRefreshToken(any())).thenReturn("refresh-token");
            when(refreshTokenRepository.save(any(RefreshToken.class)))
                    .thenAnswer(inv -> inv.getArgument(0));
            when(userRepository.save(any(User.class))).thenReturn(testUser);

            // When
            Object result = authService.authenticateUser(request, httpServletResponse);

            // Then
            assertInstanceOf(JwtResponse.class, result);
            JwtResponse jwtResponse = (JwtResponse) result;
            assertEquals("access-token", jwtResponse.getAccessToken());
            assertEquals("Bearer", jwtResponse.getTokenType());
        }

        @Test
        @DisplayName("Should return 2FA required response when 2FA is enabled")
        void authenticateUser_With2FAEnabled_ShouldReturnTwoFactorRequired() {
            // Given
            LoginRequest request = new LoginRequest("testuser", "password123");
            testUser.setIs2faEnabled(true);

            Authentication mockAuth = createMockAuthentication();

            when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class)))
                    .thenReturn(mockAuth);
            when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));

            // When
            Object result = authService.authenticateUser(request, httpServletResponse);

            // Then
            assertInstanceOf(TwoFactorRequiredResponse.class, result);
            TwoFactorRequiredResponse response = (TwoFactorRequiredResponse) result;
            assertTrue(response.isRequires2FA());
            assertEquals("test@example.com", response.getEmail());
        }
    }

    // ==================== 2FA VERIFICATION TESTS ====================

    @Nested
    @DisplayName("verify2FAAndLogin Tests")
    class Verify2FAAndLoginTests {

        @Test
        @DisplayName("Should complete login after valid 2FA code")
        void verify2FAAndLogin_WithValidCode_ShouldReturnJwtResponse() {
            // Given
            TwoFactorLoginRequest request = new TwoFactorLoginRequest();
            request.setUsernameOrEmail("test@example.com");
            request.setCode("123456");

            when(userRepository.findByUsername("test@example.com")).thenReturn(Optional.empty());
            when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.of(testUser));
            when(userRepository.findById(1L)).thenReturn(Optional.of(testUser)); // For createRefreshToken
            when(twoFactorAuthService.verifyCodeForLogin(testUser, "123456")).thenReturn(true);
            when(tokenProvider.generateAccessToken(any())).thenReturn("access-token");
            when(tokenProvider.generateRefreshToken(any())).thenReturn("refresh-token");
            when(refreshTokenRepository.save(any(RefreshToken.class)))
                    .thenAnswer(inv -> inv.getArgument(0));
            when(userRepository.save(any(User.class))).thenReturn(testUser);

            // When
            JwtResponse result = authService.verify2FAAndLogin(request, httpServletResponse);

            // Then
            assertNotNull(result);
            assertEquals("access-token", result.getAccessToken());
        }

        @Test
        @DisplayName("Should throw exception for invalid 2FA code")
        void verify2FAAndLogin_WithInvalidCode_ShouldThrowException() {
            // Given
            TwoFactorLoginRequest request = new TwoFactorLoginRequest();
            request.setUsernameOrEmail("test@example.com");
            request.setCode("000000");

            when(userRepository.findByUsername("test@example.com")).thenReturn(Optional.empty());
            when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.of(testUser));
            when(twoFactorAuthService.verifyCodeForLogin(testUser, "000000")).thenReturn(false);

            // When/Then
            BadRequestException exception = assertThrows(BadRequestException.class,
                    () -> authService.verify2FAAndLogin(request, httpServletResponse));

            assertEquals("Invalid 2FA code", exception.getMessage());
        }
    }

    // ==================== TOKEN REFRESH TESTS ====================

    @Nested
    @DisplayName("refreshToken Tests")
    class RefreshTokenTests {

        @Test
        @DisplayName("Should refresh token successfully with valid refresh token")
        void refreshToken_WithValidToken_ShouldReturnNewAccessToken() {
            // Given
            RefreshToken refreshToken = RefreshToken.builder()
                    .id(1L)
                    .token("valid-refresh-token")
                    .user(testUser)
                    .expiryDate(LocalDateTime.now().plusDays(7))
                    .revoked(false)
                    .build();

            when(refreshTokenRepository.findByToken("valid-refresh-token"))
                    .thenReturn(Optional.of(refreshToken));
            when(tokenProvider.generateAccessToken(any())).thenReturn("new-access-token");

            // When
            JwtResponse result = authService.refreshToken("valid-refresh-token", httpServletResponse);

            // Then
            assertNotNull(result);
            assertEquals("new-access-token", result.getAccessToken());
        }

        @Test
        @DisplayName("Should throw exception when refresh token is null")
        void refreshToken_WithNullToken_ShouldThrowException() {
            // When/Then
            assertThrows(TokenRefreshException.class,
                    () -> authService.refreshToken(null, httpServletResponse));
        }

        @Test
        @DisplayName("Should throw exception when refresh token is blank")
        void refreshToken_WithBlankToken_ShouldThrowException() {
            // When/Then
            assertThrows(TokenRefreshException.class,
                    () -> authService.refreshToken("   ", httpServletResponse));
        }

        @Test
        @DisplayName("Should throw exception when refresh token is revoked")
        void refreshToken_WithRevokedToken_ShouldThrowException() {
            // Given
            RefreshToken revokedToken = RefreshToken.builder()
                    .id(1L)
                    .token("revoked-token")
                    .user(testUser)
                    .expiryDate(LocalDateTime.now().plusDays(7))
                    .revoked(true)
                    .build();

            when(refreshTokenRepository.findByToken("revoked-token"))
                    .thenReturn(Optional.of(revokedToken));

            // When/Then
            assertThrows(TokenRefreshException.class,
                    () -> authService.refreshToken("revoked-token", httpServletResponse));
        }

        @Test
        @DisplayName("Should throw exception when refresh token is expired")
        void refreshToken_WithExpiredToken_ShouldThrowException() {
            // Given
            RefreshToken expiredToken = RefreshToken.builder()
                    .id(1L)
                    .token("expired-token")
                    .user(testUser)
                    .expiryDate(LocalDateTime.now().minusDays(1)) // Expired
                    .revoked(false)
                    .build();

            when(refreshTokenRepository.findByToken("expired-token"))
                    .thenReturn(Optional.of(expiredToken));

            // When/Then
            assertThrows(TokenRefreshException.class,
                    () -> authService.refreshToken("expired-token", httpServletResponse));

            verify(refreshTokenRepository).delete(expiredToken);
        }
    }

    // ==================== HELPER METHODS ====================

    private SignupRequest createSignupRequest() {
        SignupRequest request = new SignupRequest();
        request.setUsername("newuser");
        request.setEmail("newuser@example.com");
        request.setPassword("Password123!");
        request.setFirstName("New");
        request.setLastName("User");
        return request;
    }

    private Authentication createMockAuthentication() {
        UserDetailsImpl userDetails = new UserDetailsImpl(
                1L,
                "testuser",
                "test@example.com",
                "encodedPassword",
                Set.of(),
                null,
                true
        );

        Authentication mockAuth = mock(Authentication.class);
        when(mockAuth.getPrincipal()).thenReturn(userDetails);
        return mockAuth;
    }
}
