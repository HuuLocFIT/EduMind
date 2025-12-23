package com.edumind.auth.service;

import com.edumind.auth.entity.EmailVerificationToken;
import com.edumind.auth.entity.User;
import com.edumind.auth.repository.EmailVerificationTokenRepository;
import com.edumind.auth.repository.UserRepository;
import com.edumind.common.exception.BadRequestException;
import com.edumind.common.exception.ResourceNotFoundException;
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
    private EmailService emailService;

    @InjectMocks
    private EmailVerificationService emailVerificationService;

    private User testUser;
    private EmailVerificationToken testToken;
    private final String TOKEN_STRING = "verification-token-uuid";
    private final String EMAIL = "user@example.com";

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(emailVerificationService, "expirationMs", 86400000L); // 24 hours

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
            emailVerificationService.sendVerificationEmail(testUser);

            // Then
            ArgumentCaptor<EmailVerificationToken> tokenCaptor = ArgumentCaptor.forClass(EmailVerificationToken.class);
            verify(tokenRepository).save(tokenCaptor.capture());
            
            EmailVerificationToken savedToken = tokenCaptor.getValue();
            assertEquals(testUser, savedToken.getUser());
            assertNotNull(savedToken.getToken());
            assertNull(savedToken.getVerifiedAt());

            verify(emailService).sendWelcomeAndVerificationEmail(eq(EMAIL), eq("Test"), eq(savedToken.getToken()));
        }

        @Test
        @DisplayName("Should throw exception if user already verified")
        void sendVerificationEmail_AlreadyVerified() {
            // Given
            testUser.setIsEmailVerified(true);

            // When/Then
            BadRequestException ex = assertThrows(BadRequestException.class, () -> 
                emailVerificationService.sendVerificationEmail(testUser));
            assertEquals("Email is already verified", ex.getMessage());
            
            verify(tokenRepository, never()).save(any());
            verify(emailService, never()).sendWelcomeAndVerificationEmail(anyString(), anyString(), anyString());
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
    }

    @Nested
    @DisplayName("resendVerificationEmail Tests")
    class ResendVerificationEmailTests {

        @Test
        @DisplayName("Should resend email successfully")
        void resendVerificationEmail_Success() {
            // Given
            when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(testUser));
            when(tokenRepository.countByUserAndVerifiedAtIsNull(testUser)).thenReturn(0);

            // When
            emailVerificationService.resendVerificationEmail(EMAIL);

            // Then
            verify(tokenRepository).save(any(EmailVerificationToken.class));
            verify(emailService).sendWelcomeAndVerificationEmail(eq(EMAIL), anyString(), anyString());
        }

        @Test
        @DisplayName("Should fail if user not found")
        void resendVerificationEmail_UserNotFound() {
            // Given
            when(userRepository.findByEmail("unknown@email.com")).thenReturn(Optional.empty());

            // When/Then
            assertThrows(ResourceNotFoundException.class, () -> 
                emailVerificationService.resendVerificationEmail("unknown@email.com"));
        }

        @Test
        @DisplayName("Should fail if too many requests")
        void resendVerificationEmail_TooManyRequests() {
            // Given
            when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(testUser));
            when(tokenRepository.countByUserAndVerifiedAtIsNull(testUser)).thenReturn(3);

            // When/Then
            BadRequestException ex = assertThrows(BadRequestException.class, () -> 
                emailVerificationService.resendVerificationEmail(EMAIL));
            assertEquals("Too many verification requests. Please try again later.", ex.getMessage());
        }

        @Test
        @DisplayName("Should fail when resending for already verified user")
        void resendVerificationEmail_AlreadyVerified() {
            // Given
            testUser.setIsEmailVerified(true);
            when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(testUser));

            // When/Then
            BadRequestException ex = assertThrows(BadRequestException.class, () ->
                    emailVerificationService.resendVerificationEmail(EMAIL));
            assertEquals("Email is already verified", ex.getMessage());

            verify(tokenRepository, never()).countByUserAndVerifiedAtIsNull(any());
            verify(tokenRepository, never()).save(any());
            verify(emailService, never()).sendWelcomeAndVerificationEmail(anyString(), anyString(), anyString());
        }
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
