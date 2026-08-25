package com.edumind.auth.service;

import com.edumind.auth.entity.EmailVerificationToken;
import com.edumind.auth.entity.User;
import com.edumind.auth.event.EmailPayloadFactory;
import com.edumind.auth.event.VerificationEmailRequested;
import com.edumind.auth.repository.EmailVerificationTokenRepository;
import com.edumind.auth.repository.UserRepository;
import com.edumind.common.exception.BadRequestException;
import com.edumind.common.exception.TooManyRequestsException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.context.ApplicationEventPublisher;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class EmailVerificationServiceTest {

    @Mock
    private EmailVerificationTokenRepository tokenRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private ApplicationEventPublisher eventPublisher;

    @Mock
    private EmailPayloadFactory emailPayloadFactory;

    @Mock
    private EmailVerificationResendRateLimiter resendRateLimiter;

    @InjectMocks
    private EmailVerificationService emailVerificationService;

    private User testUser;
    private EmailVerificationToken testToken;
    private final String TOKEN_STRING = "verification-token-uuid";
    private final String EMAIL = "user@example.com";

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(emailVerificationService, "expirationMs", 86400000L); // 24 hours
        ReflectionTestUtils.setField(emailVerificationService, "resendMax", 3);

        testUser = User.builder()
                .id(1L)
                .email(EMAIL)
                .firstName("Test")
                .isEmailVerified(false)
                .build();

        testToken = new EmailVerificationToken();
        testToken.setId(1L);
        testToken.setToken(TOKEN_STRING);
        testToken.setUser(testUser);
        testToken.setExpiryDate(LocalDateTime.now().plusHours(24));
        testToken.setVerifiedAt(null);
    }

    @Nested
    @DisplayName("sendVerificationEmail Tests")
    class SendVerificationEmailTests {

        @Test
        @DisplayName("Should send email successfully")
        void sendVerificationEmail_Success() {
            // Given
            // No extra mocks needed

            // When
            when(userRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(testUser));
            when(tokenRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
            VerificationEmailRequested event = new VerificationEmailRequested(EMAIL, "Test", "url", true);
            when(emailPayloadFactory.verification(eq(testUser), anyString(), eq(true))).thenReturn(event);
            emailVerificationService.sendInitialVerificationEmail(testUser);

            // Then
            ArgumentCaptor<EmailVerificationToken> tokenCaptor = ArgumentCaptor.forClass(EmailVerificationToken.class);
            verify(tokenRepository).save(tokenCaptor.capture());
            
            EmailVerificationToken savedToken = tokenCaptor.getValue();
            assertEquals(testUser, savedToken.getUser());
            assertNotNull(savedToken.getToken());
            assertNull(savedToken.getVerifiedAt());

            verify(eventPublisher).publishEvent(event);
        }

        @Test
        @DisplayName("Should throw exception if user already verified")
        void sendVerificationEmail_AlreadyVerified() {
            // Given
            testUser.setIsEmailVerified(true);
            when(userRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(testUser));

            // When/Then
            BadRequestException ex = assertThrows(BadRequestException.class, () -> 
                emailVerificationService.sendInitialVerificationEmail(testUser));
            assertEquals("Email is already verified", ex.getMessage());
            
            verify(tokenRepository, never()).save(any());
            verify(eventPublisher, never()).publishEvent(any());
        }
    }

    @Nested
    @DisplayName("verifyEmail Tests")
    class VerifyEmailTests {

        @Test
        @DisplayName("Should verify email successfully")
        void verifyEmail_Success() {
            // Given
            when(tokenRepository.findByToken(TOKEN_STRING)).thenReturn(Optional.of(testToken));

            // When
            emailVerificationService.verifyEmail(TOKEN_STRING);

            // Then
            assertTrue(testUser.getIsEmailVerified());
            assertNotNull(testToken.getVerifiedAt());
            verify(tokenRepository).save(testToken);
            verify(userRepository).save(testUser);
        }

        @Test
        @DisplayName("Should fail if token invalid")
        void verifyEmail_InvalidToken() {
            // Given
            when(tokenRepository.findByToken("invalid")).thenReturn(Optional.empty());

            // When/Then
            BadRequestException ex = assertThrows(BadRequestException.class, () -> 
                emailVerificationService.verifyEmail("invalid"));
            assertEquals("Invalid verification token", ex.getMessage());
        }

        @Test
        @DisplayName("Should fail if token already used")
        void verifyEmail_TokenUsed() {
            // Given
            testToken.setVerifiedAt(LocalDateTime.now());
            when(tokenRepository.findByToken(TOKEN_STRING)).thenReturn(Optional.of(testToken));

            // When/Then
            BadRequestException ex = assertThrows(BadRequestException.class, () -> 
                emailVerificationService.verifyEmail(TOKEN_STRING));
            assertEquals("This verification link has already been used", ex.getMessage());
        }

        @Test
        @DisplayName("Should be idempotent when token and user are already verified")
        void verifyEmail_TokenAndUserAlreadyVerified() {
            testToken.setVerifiedAt(LocalDateTime.now());
            testUser.setIsEmailVerified(true);
            when(tokenRepository.findByToken(TOKEN_STRING)).thenReturn(Optional.of(testToken));

            assertDoesNotThrow(() -> emailVerificationService.verifyEmail(TOKEN_STRING));
            verify(tokenRepository, never()).save(any());
            verify(userRepository, never()).save(any());
        }

        @Test
        @DisplayName("Should fail if token expired")
        void verifyEmail_TokenExpired() {
            // Given
            testToken.setExpiryDate(LocalDateTime.now().minusMinutes(1));
            when(tokenRepository.findByToken(TOKEN_STRING)).thenReturn(Optional.of(testToken));

            // When/Then
            BadRequestException ex = assertThrows(BadRequestException.class, () -> 
                emailVerificationService.verifyEmail(TOKEN_STRING));
            assertEquals("Verification link has expired. Please request a new one.", ex.getMessage());
        }

        @Test
        @DisplayName("Should reject an invalidated token before checking expiry")
        void verifyEmail_InvalidatedToken() {
            testToken.setInvalidatedAt(LocalDateTime.now());
            testToken.setExpiryDate(LocalDateTime.now().minusMinutes(1));
            when(tokenRepository.findByToken(TOKEN_STRING)).thenReturn(Optional.of(testToken));

            BadRequestException ex = assertThrows(BadRequestException.class,
                    () -> emailVerificationService.verifyEmail(TOKEN_STRING));
            assertEquals("This verification link is no longer valid. Please request a new one.", ex.getMessage());
        }
    }

    @Nested
    @DisplayName("resendVerificationEmail Tests")
    class ResendVerificationEmailTests {

        @Test
        @DisplayName("Should resend email successfully")
        void resendVerificationEmail_Success() {
            // Given
            allowResend(EMAIL, 1);
            when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(testUser));
            when(userRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(testUser));
            when(tokenRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
            VerificationEmailRequested event = new VerificationEmailRequested(EMAIL, "Test", "url", false);
            when(emailPayloadFactory.verification(eq(testUser), anyString(), eq(false))).thenReturn(event);

            // When
            emailVerificationService.resendVerificationEmail(EMAIL);

            // Then
            verify(tokenRepository).save(any(EmailVerificationToken.class));
            verify(eventPublisher).publishEvent(event);
        }

        @Test
        @DisplayName("Should return success without issuing a token if user not found")
        void resendVerificationEmail_UserNotFound() {
            allowResend("unknown@email.com", 1);
            when(userRepository.findByEmail("unknown@email.com")).thenReturn(Optional.empty());
            assertDoesNotThrow(() -> emailVerificationService.resendVerificationEmail("unknown@email.com"));
            verify(tokenRepository, never()).save(any());
        }

        @Test
        @DisplayName("Should fail if too many requests")
        void resendVerificationEmail_TooManyRequests() {
            // Given
            allowResend(EMAIL, 4);

            // When/Then
            TooManyRequestsException ex = assertThrows(TooManyRequestsException.class, () ->
                emailVerificationService.resendVerificationEmail(EMAIL));
            assertEquals("Too many verification requests. Please try again later.", ex.getMessage());
        }

        @Test
        @DisplayName("Should return the generic success behavior for already verified user")
        void resendVerificationEmail_AlreadyVerified() {
            // Given
            testUser.setIsEmailVerified(true);
            allowResend(EMAIL, 1);
            when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(testUser));

            assertDoesNotThrow(() -> emailVerificationService.resendVerificationEmail(EMAIL));

            verify(tokenRepository, never()).save(any());
            verify(eventPublisher, never()).publishEvent(any());
        }

        @Test
        @DisplayName("Should silently succeed when verification wins the race after the initial lookup")
        void resendVerificationEmail_VerifiedDuringLockedRecheck() {
            allowResend(EMAIL, 1);
            when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(testUser));

            User lockedUser = User.builder()
                    .id(testUser.getId())
                    .email(testUser.getEmail())
                    .isEmailVerified(true)
                    .build();
            when(userRepository.findByIdForUpdate(testUser.getId())).thenReturn(Optional.of(lockedUser));

            assertDoesNotThrow(() -> emailVerificationService.resendVerificationEmail(EMAIL));

            verify(tokenRepository, never()).invalidateActiveTokens(any(), any());
            verify(tokenRepository, never()).save(any());
            verify(eventPublisher, never()).publishEvent(any());
        }
    }

    private void allowResend(String email, int attempts) {
        when(resendRateLimiter.hashEmail(email)).thenReturn("hash");
        when(resendRateLimiter.incrementAndGet("hash")).thenReturn(attempts);
    }

    @Test
    @DisplayName("cleanupExpiredTokens should delegate to repository and return deleted count")
    void cleanupExpiredTokens_ShouldReturnDeletedCount() {
        // Given
        when(tokenRepository.deleteExpiredTokens(any(LocalDateTime.class))).thenReturn(5);

        // When
        int deleted = emailVerificationService.cleanupExpiredTokens();

        // Then
        assertEquals(5, deleted);
        verify(tokenRepository).deleteExpiredTokens(any(LocalDateTime.class));
    }
}
