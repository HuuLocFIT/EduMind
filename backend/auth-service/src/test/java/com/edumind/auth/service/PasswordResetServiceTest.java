package com.edumind.auth.service;

import com.edumind.auth.entity.PasswordResetToken;
import com.edumind.auth.entity.User;
import com.edumind.auth.event.EmailPayloadFactory;
import com.edumind.auth.event.PasswordChangedEmailRequested;
import com.edumind.auth.event.PasswordResetEmailRequested;
import com.edumind.auth.repository.PasswordResetTokenRepository;
import com.edumind.auth.repository.RefreshTokenRepository;
import com.edumind.auth.repository.UserRepository;
import com.edumind.common.exception.BadRequestException;
import com.edumind.common.exception.TooManyRequestsException;
import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PasswordResetServiceTest {

    @Mock
    private PasswordResetTokenRepository tokenRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private EmailService emailService;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private HttpServletRequest httpRequest;

    @Mock
    private PasswordResetRateLimiter rateLimiter;

    @Mock
    private RefreshTokenRepository refreshTokenRepository;

    @Mock
    private EmailPayloadFactory emailPayloadFactory;

    @Mock
    private ApplicationEventPublisher eventPublisher;

    @InjectMocks
    private PasswordResetService passwordResetService;

    private User testUser;
    private PasswordResetToken testToken;
    private final String VALID_EMAIL = "user@example.com";
    private final String INVALID_EMAIL = "unknown@example.com";
    private final String VALID_TOKEN = "valid-token-uuid";

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(passwordResetService, "expirationMs", 3600000L); // 1 hour

        testUser = User.builder()
                .id(1L)
                .email(VALID_EMAIL)
                .firstName("Test")
                .password("oldPassword")
                .build();

        testToken = new PasswordResetToken();
        testToken.setId(1L);
        testToken.setToken(VALID_TOKEN);
        testToken.setUser(testUser);
        testToken.setExpiryDate(LocalDateTime.now().plusHours(1));
        testToken.setUsed(false);
    }

    @Nested
    @DisplayName("requestPasswordReset Tests")
    class RequestPasswordResetTests {

        @Test
        @DisplayName("Should create token and send email when user exists")
        void requestPasswordReset_Success() {
            // Given
            when(rateLimiter.hashEmail(VALID_EMAIL)).thenReturn("some-hash");
            when(rateLimiter.incrementAndGet("some-hash")).thenReturn(1);
            when(userRepository.findByEmail(VALID_EMAIL)).thenReturn(Optional.of(testUser));
            when(httpRequest.getHeader("X-Forwarded-For")).thenReturn(null);
            when(httpRequest.getRemoteAddr()).thenReturn("127.0.0.1");
            when(httpRequest.getHeader("User-Agent")).thenReturn("JUnit-Agent");
            PasswordResetEmailRequested emailEvent = new PasswordResetEmailRequested(VALID_EMAIL, "Test", "ignored");
            when(emailPayloadFactory.passwordReset(eq(testUser), anyString())).thenReturn(emailEvent);

            // When
            passwordResetService.requestPasswordReset(VALID_EMAIL, httpRequest);

            // Then
            ArgumentCaptor<PasswordResetToken> tokenCaptor = ArgumentCaptor.forClass(PasswordResetToken.class);
            verify(tokenRepository).save(tokenCaptor.capture());

            PasswordResetToken savedToken = tokenCaptor.getValue();
            assertEquals(testUser, savedToken.getUser());
            assertNotNull(savedToken.getToken());
            assertFalse(savedToken.isUsed());
            assertEquals("127.0.0.1", savedToken.getIpAddress());
            assertEquals("JUnit-Agent", savedToken.getUserAgent());

            verify(emailPayloadFactory).passwordReset(testUser, savedToken.getToken());
            verify(eventPublisher).publishEvent(emailEvent);
        }

        @Test
        @DisplayName("Should do nothing if user does not exist (Silent fail)")
        void requestPasswordReset_UserNotFound() {
            // Given
            when(rateLimiter.hashEmail(INVALID_EMAIL)).thenReturn("invalid-hash");
            when(rateLimiter.incrementAndGet("invalid-hash")).thenReturn(1);
            when(userRepository.findByEmail(INVALID_EMAIL)).thenReturn(Optional.empty());

            // When
            passwordResetService.requestPasswordReset(INVALID_EMAIL, httpRequest);

            // Then
            verify(tokenRepository, never()).save(any());
            verify(emailService, never()).sendPasswordResetEmail(anyString(), anyString(), anyString());
        }

        @Test
        @DisplayName("Should throw exception if too many requests")
        void requestPasswordReset_TooManyRequests() {
            // Given
            when(rateLimiter.hashEmail(VALID_EMAIL)).thenReturn("some-hash");
            when(rateLimiter.incrementAndGet("some-hash")).thenReturn(4); // MAX_RESET_REQUESTS_PER_HOUR + 1

            // When/Then
            TooManyRequestsException ex = assertThrows(TooManyRequestsException.class, () ->
                passwordResetService.requestPasswordReset(VALID_EMAIL, httpRequest));

            assertEquals("Too many password reset requests. Please try again later.", ex.getMessage());
            verify(userRepository, never()).findByEmail(anyString());
            verify(tokenRepository, never()).save(any());
        }

        @Test
        @DisplayName("Should throw exception if too many requests, even for a non-existent email (no user-enumeration oracle)")
        void requestPasswordReset_TooManyRequests_NonExistentEmail() {
            // Given
            when(rateLimiter.hashEmail(INVALID_EMAIL)).thenReturn("invalid-hash");
            when(rateLimiter.incrementAndGet("invalid-hash")).thenReturn(4); // MAX_RESET_REQUESTS_PER_HOUR + 1

            // When/Then
            TooManyRequestsException ex = assertThrows(TooManyRequestsException.class, () ->
                passwordResetService.requestPasswordReset(INVALID_EMAIL, httpRequest));

            assertEquals("Too many password reset requests. Please try again later.", ex.getMessage());
            verify(userRepository, never()).findByEmail(anyString());
            verify(tokenRepository, never()).save(any());
            verify(emailService, never()).sendPasswordResetEmail(anyString(), anyString(), anyString());
        }
    }

    @Nested
    @DisplayName("validateResetToken Tests")
    class ValidateResetTokenTests {

        @Test
        @DisplayName("Should return user for valid token")
        void validateResetToken_Success() {
            // Given
            when(tokenRepository.findByToken(VALID_TOKEN)).thenReturn(Optional.of(testToken));

            // When
            User result = passwordResetService.validateResetToken(VALID_TOKEN);

            // Then
            assertEquals(testUser, result);
        }

        @Test
        @DisplayName("Should throw exception if token not found")
        void validateResetToken_NotFound() {
            // Given
            when(tokenRepository.findByToken("invalid")).thenReturn(Optional.empty());

            // When/Then
            BadRequestException ex = assertThrows(BadRequestException.class, () ->
                passwordResetService.validateResetToken("invalid"));
            assertEquals("Invalid password reset token", ex.getMessage());
        }

        @Test
        @DisplayName("Should throw exception if token expired")
        void validateResetToken_Expired() {
            // Given
            testToken.setExpiryDate(LocalDateTime.now().minusMinutes(1));
            when(tokenRepository.findByToken(VALID_TOKEN)).thenReturn(Optional.of(testToken));

            // When/Then
            BadRequestException ex = assertThrows(BadRequestException.class, () ->
                passwordResetService.validateResetToken(VALID_TOKEN));
            assertEquals("Password reset link has expired. Please request a new one.", ex.getMessage());
        }

        @Test
        @DisplayName("Should throw exception if token used")
        void validateResetToken_Used() {
            // Given
            testToken.setUsed(true);
            when(tokenRepository.findByToken(VALID_TOKEN)).thenReturn(Optional.of(testToken));

            // When/Then
            BadRequestException ex = assertThrows(BadRequestException.class, () ->
                passwordResetService.validateResetToken(VALID_TOKEN));
            assertEquals("This password reset link has already been used", ex.getMessage());
        }
    }

    @Nested
    @DisplayName("resetPassword Tests")
    class ResetPasswordTests {

        @Test
        @DisplayName("Should reset password successfully")
        void resetPassword_Success() {
            // Given
            String newPass = "NewPass123";
            when(tokenRepository.findByToken(VALID_TOKEN)).thenReturn(Optional.of(testToken));
            when(passwordEncoder.encode(newPass)).thenReturn("encodedNewPass");
            when(emailPayloadFactory.displayName(testUser)).thenReturn("Test");

            // When
            passwordResetService.resetPassword(VALID_TOKEN, newPass, newPass);

            // Then
            assertTrue(testToken.isUsed());
            verify(tokenRepository).save(testToken); // Mark used
            verify(userRepository).save(testUser); // Save new password
            verify(refreshTokenRepository).revokeAllUserTokens(testUser);
            verify(passwordEncoder).encode(newPass);
            verify(tokenRepository).invalidateAllTokensForUser(eq(testUser), any(LocalDateTime.class));
            verify(eventPublisher).publishEvent(new PasswordChangedEmailRequested(VALID_EMAIL, "Test"));
        }

        @Test
        @DisplayName("Should fail if passwords mismatch")
        void resetPassword_Mismatch() {
            // Given
            String pass1 = "Pass1";
            String pass2 = "Pass2";

            // When/Then
            BadRequestException ex = assertThrows(BadRequestException.class, () ->
                passwordResetService.resetPassword(VALID_TOKEN, pass1, pass2));
            assertEquals("Passwords do not match", ex.getMessage());
            
            verify(userRepository, never()).save(any());
            verify(refreshTokenRepository, never()).revokeAllUserTokens(any());
        }

        @Test
        @DisplayName("Should fail when token not found on second lookup")
        void resetPassword_InvalidTokenOnSecondLookup() {
            // Given
            String newPass = "NewPass123";
            when(tokenRepository.findByToken(VALID_TOKEN))
                    .thenReturn(Optional.of(testToken))  // for validateResetToken
                    .thenReturn(Optional.empty());       // for second lookup inside resetPassword

            // When / Then
            BadRequestException ex = assertThrows(BadRequestException.class, () ->
                    passwordResetService.resetPassword(VALID_TOKEN, newPass, newPass));
            assertEquals("Invalid token", ex.getMessage());

            verify(passwordEncoder, never()).encode(anyString());
            verify(userRepository, never()).save(any());
            verify(refreshTokenRepository, never()).revokeAllUserTokens(any());
        }
    }

    @Test
    @DisplayName("cleanupTokens should delegate to repository and return deleted count")
    void cleanupTokens_ShouldReturnDeletedCount() {
        // Given
        when(tokenRepository.deleteExpiredAndUsedTokens(any(LocalDateTime.class))).thenReturn(4);

        // When
        int deleted = passwordResetService.cleanupTokens();

        // Then
        assertEquals(4, deleted);
        verify(tokenRepository).deleteExpiredAndUsedTokens(any(LocalDateTime.class));
    }
}
