package com.edumind.auth.service;

import com.edumind.auth.dto.request.LoginRequest;
import com.edumind.auth.dto.request.SignupRequest;
import com.edumind.auth.dto.request.TwoFactorLoginRequest;
import com.edumind.auth.dto.model.OAuth2UserInfo;
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
import com.edumind.common.exception.EmailNotVerifiedException;
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
        ReflectionTestUtils.setField(authService, "enforceEmailVerification", true);

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

        @Test
        @DisplayName("Should reject an unverified local user before disclosing 2FA")
        void authenticateUser_UnverifiedLocalWith2FA_ShouldThrow() {
            LoginRequest request = new LoginRequest("testuser", "password123");
            testUser.setIsEmailVerified(false);
            testUser.setIs2faEnabled(true);

            Authentication mockAuth = createMockAuthentication();
            when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class)))
                    .thenReturn(mockAuth);
            when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));

            EmailNotVerifiedException exception = assertThrows(EmailNotVerifiedException.class,
                    () -> authService.authenticateUser(request, httpServletResponse));

            assertEquals("Please verify your email before signing in.", exception.getMessage());
            verify(refreshTokenRepository, never()).save(any());
        }

        @Test
        @DisplayName("Should reject an unverified local user without 2FA")
        void authenticateUser_UnverifiedLocal_ShouldThrow() {
            LoginRequest request = new LoginRequest("testuser", "password123");
            testUser.setIsEmailVerified(false);

            Authentication mockAuth = createMockAuthentication();
            when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class)))
                    .thenReturn(mockAuth);
            when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));

            assertThrows(EmailNotVerifiedException.class,
                    () -> authService.authenticateUser(request, httpServletResponse));
            verify(refreshTokenRepository, never()).save(any());
        }

        @Test
        @DisplayName("OAuth provider skips the password-path verification policy guard")
        void authenticateUser_OAuthProvider_SkipsVerificationGuard() {
            // This state is unreachable in production because OAuth users have no password.
            LoginRequest request = new LoginRequest("testuser", "password123");
            testUser.setProvider(AuthProvider.GOOGLE);
            testUser.setIsEmailVerified(false);
            Authentication mockAuth = createMockAuthentication();
            when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class)))
                    .thenReturn(mockAuth);
            when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));
            when(tokenProvider.generateAccessToken(any())).thenReturn("access-token");
            when(tokenProvider.generateRefreshToken(any())).thenReturn("refresh-token");
            when(refreshTokenRepository.save(any(RefreshToken.class))).thenAnswer(inv -> inv.getArgument(0));

            assertInstanceOf(JwtResponse.class,
                    authService.authenticateUser(request, httpServletResponse));
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

        @Test
        @DisplayName("Should reject unverified local user after a valid 2FA code")
        void verify2FAAndLogin_UnverifiedLocal_ShouldThrow() {
            TwoFactorLoginRequest request = new TwoFactorLoginRequest();
            request.setUsernameOrEmail("test@example.com");
            request.setCode("123456");
            testUser.setIsEmailVerified(false);

            when(userRepository.findByUsername("test@example.com")).thenReturn(Optional.empty());
            when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.of(testUser));
            when(twoFactorAuthService.verifyCodeForLogin(testUser, "123456")).thenReturn(true);

            assertThrows(EmailNotVerifiedException.class,
                    () -> authService.verify2FAAndLogin(request, httpServletResponse));
            verify(refreshTokenRepository, never()).save(any());
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
        @DisplayName("Should reject refresh for an unverified local user")
        void refreshToken_UnverifiedLocal_ShouldThrow() {
            testUser.setIsEmailVerified(false);
            RefreshToken refreshToken = RefreshToken.builder()
                    .token("valid-refresh-token")
                    .user(testUser)
                    .expiryDate(LocalDateTime.now().plusDays(7))
                    .revoked(false)
                    .build();
            when(refreshTokenRepository.findByToken("valid-refresh-token"))
                    .thenReturn(Optional.of(refreshToken));

            assertThrows(EmailNotVerifiedException.class,
                    () -> authService.refreshToken("valid-refresh-token", httpServletResponse));
            verify(refreshTokenRepository, never()).save(any());
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

        @Test
        @DisplayName("Should refresh for an unverified OAuth user")
        void refreshToken_UnverifiedOAuthUser_ShouldSucceed() {
            testUser.setProvider(AuthProvider.GOOGLE);
            testUser.setIsEmailVerified(false);
            RefreshToken refreshToken = RefreshToken.builder()
                    .token("oauth-refresh-token")
                    .user(testUser)
                    .expiryDate(LocalDateTime.now().plusDays(7))
                    .revoked(false)
                    .build();
            when(refreshTokenRepository.findByToken("oauth-refresh-token"))
                    .thenReturn(Optional.of(refreshToken));
            when(tokenProvider.generateAccessToken(any())).thenReturn("new-access-token");

            JwtResponse result = authService.refreshToken("oauth-refresh-token", httpServletResponse);

            assertEquals("new-access-token", result.getAccessToken());
        }
    }

    @Test
    @DisplayName("OAuth refresh heals an existing unverified user")
    void updateExistingUser_WhenNotVerified_ShouldMarkVerified() {
        testUser.setProvider(AuthProvider.GOOGLE);
        testUser.setProviderUserId("google-id");
        testUser.setIsEmailVerified(false);
        OAuth2UserInfo info = mock(OAuth2UserInfo.class);
        when(info.getId()).thenReturn("google-id");
        when(info.getEmail()).thenReturn(testUser.getEmail());
        when(userRepository.findByProviderAndProviderUserId(AuthProvider.GOOGLE, "google-id"))
                .thenReturn(Optional.of(testUser));
        when(userRepository.save(testUser)).thenReturn(testUser);

        User result = authService.processOAuth2User("google", info);

        assertTrue(result.getIsEmailVerified());
        verify(userRepository).save(testUser);
    }

    // ==================== HELPER METHODS ====================

    private SignupRequest createSignupRequest() {
        SignupRequest request = new SignupRequest();
        request.setUsername("newuser");
        request.setEmail("newuser@example.com");
        request.setPassword("Password123!");
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
                true,
                null  // trialEndDate
        );

        Authentication mockAuth = mock(Authentication.class);
        when(mockAuth.getPrincipal()).thenReturn(userDetails);
        return mockAuth;
    }
}
