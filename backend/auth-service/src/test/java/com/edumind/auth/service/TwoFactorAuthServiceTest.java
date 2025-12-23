package com.edumind.auth.service;

import com.edumind.auth.dto.response.BackupCodesResponse;
import com.edumind.auth.dto.response.TwoFactorSetupResponse;
import com.edumind.auth.dto.response.TwoFactorStatusResponse;
import com.edumind.auth.entity.User;
import com.edumind.auth.enums.AuthProvider;
import com.edumind.auth.repository.UserRepository;
import com.edumind.common.exception.BadRequestException;
import com.edumind.common.exception.ResourceNotFoundException;
import com.edumind.common.security.EncryptionService;
import com.edumind.common.security.RateLimitService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Unit tests for TwoFactorAuthService
 * Tests 2FA setup, verification, disable, and backup codes functionality
 */
@ExtendWith(MockitoExtension.class)
class TwoFactorAuthServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private EncryptionService encryptionService;

    @Mock
    private RateLimitService rateLimitService;

    @InjectMocks
    private TwoFactorAuthService twoFactorAuthService;

    private User testUser;

    @BeforeEach
    void setUp() {
        // Create test user
        testUser = User.builder()
                .id(1L)
                .username("testuser")
                .email("test@example.com")
                .password("encodedPassword")
                .isActive(true)
                .isEmailVerified(true)
                .is2faEnabled(false)
                .provider(AuthProvider.LOCAL)
                .build();
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    private void setupSecurityContext() {
        SecurityContext securityContext = mock(SecurityContext.class);
        Authentication authentication = mock(Authentication.class);
        when(authentication.getName()).thenReturn("testuser");
        when(securityContext.getAuthentication()).thenReturn(authentication);
        SecurityContextHolder.setContext(securityContext);
    }

    // ==================== SETUP 2FA TESTS ====================

    @Nested
    @DisplayName("setup2FA Tests")
    class Setup2FATests {

        @Test
        @DisplayName("Should setup 2FA successfully for user without 2FA")
        void setup2FA_WhenNot2FAEnabled_ShouldReturnSetupResponse() {
            // Given
            setupSecurityContext();
            testUser.setIs2faEnabled(false);

            when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(testUser));
            when(encryptionService.encrypt(anyString())).thenReturn("encryptedSecret");
            when(userRepository.save(any(User.class))).thenReturn(testUser);

            // When
            TwoFactorSetupResponse result = twoFactorAuthService.setup2FA();

            // Then
            assertNotNull(result);
            assertNotNull(result.getSecret());
            assertNotNull(result.getQrCodeUrl());
            assertNotNull(result.getBackupCodes());
            assertEquals(5, result.getBackupCodes().size()); // BACKUP_CODES_COUNT = 5
            verify(userRepository).save(any(User.class));
        }

        @Test
        @DisplayName("Should throw exception when 2FA already enabled")
        void setup2FA_When2FAAlreadyEnabled_ShouldThrowException() {
            // Given
            setupSecurityContext();
            testUser.setIs2faEnabled(true);

            when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(testUser));

            // When/Then
            BadRequestException exception = assertThrows(BadRequestException.class,
                    () -> twoFactorAuthService.setup2FA());

            assertEquals("2FA is already enabled", exception.getMessage());
            verify(userRepository, never()).save(any(User.class));
        }
    }

    // ==================== VERIFY 2FA TESTS ====================

    @Nested
    @DisplayName("verify2FA Tests")
    class Verify2FATests {

        @Test
        @DisplayName("Should throw exception when 2FA already enabled")
        void verify2FA_When2FAAlreadyEnabled_ShouldThrowException() {
            // Given
            setupSecurityContext();
            testUser.setIs2faEnabled(true);

            when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(testUser));
            doNothing().when(rateLimitService).checkRateLimit(anyLong());

            // When/Then
            BadRequestException exception = assertThrows(BadRequestException.class,
                    () -> twoFactorAuthService.verify2FA("123456", "secret"));

            assertEquals("2FA is already enabled", exception.getMessage());
        }

        @Test
        @DisplayName("Should throw exception for invalid verification code")
        void verify2FA_WithInvalidCode_ShouldThrowException() {
            // Given
            setupSecurityContext();
            testUser.setIs2faEnabled(false);

            when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(testUser));
            doNothing().when(rateLimitService).checkRateLimit(anyLong());
            doNothing().when(rateLimitService).recordFailedAttempt(anyLong());

            // When/Then - Using reflection to mock verifyCode to return false
            BadRequestException exception = assertThrows(BadRequestException.class,
                    () -> twoFactorAuthService.verify2FA("000000", "invalidSecret"));

            assertEquals("Invalid verification code", exception.getMessage());
            verify(rateLimitService).recordFailedAttempt(1L);
        }

        // Note: Testing valid TOTP code verification requires actual TOTP secret and current time code
        // which is difficult to mock. The invalid code path is tested in verify2FA_WithInvalidCode_ShouldThrowException
        // For integration testing, use real TOTP codes generated from authenticator apps

        @Test
        @DisplayName("Should throw exception when user not found")
        void verify2FA_WhenUserNotFound_ShouldThrowException() {
            // Given
            setupSecurityContext();
            when(userRepository.findByUsername("testuser")).thenReturn(Optional.empty());

            // When/Then
            assertThrows(ResourceNotFoundException.class,
                    () -> twoFactorAuthService.verify2FA("123456", "secret"));
        }
    }

    // ==================== VERIFY CODE FOR LOGIN TESTS ====================

    @Nested
    @DisplayName("verifyCodeForLogin Tests")
    class VerifyCodeForLoginTests {

        @Test
        @DisplayName("Should return false when 2FA not enabled")
        void verifyCodeForLogin_When2FANotEnabled_ShouldReturnFalse() {
            // Given
            testUser.setIs2faEnabled(false);
            doNothing().when(rateLimitService).checkRateLimit(anyLong());

            // When
            boolean result = twoFactorAuthService.verifyCodeForLogin(testUser, "123456");

            // Then
            assertFalse(result);
        }

        @Test
        @DisplayName("Should return false for invalid TOTP code")
        void verifyCodeForLogin_WithInvalidTOTPCode_ShouldReturnFalse() {
            // Given
            testUser.setIs2faEnabled(true);
            testUser.setTwoFactorSecret("encryptedSecret");

            doNothing().when(rateLimitService).checkRateLimit(anyLong());
            when(encryptionService.decrypt("encryptedSecret")).thenReturn("decryptedSecret");
            doNothing().when(rateLimitService).recordFailedAttempt(anyLong());

            // When - Will fail verification because code is not valid
            boolean result = twoFactorAuthService.verifyCodeForLogin(testUser, "123456");

            // Then
            assertFalse(result); // Invalid code
            verify(rateLimitService).recordFailedAttempt(1L);
        }

        @Test
        @DisplayName("Should return false when backup codes are null")
        void verifyCodeForLogin_WithNullBackupCodes_ShouldReturnFalse() {
            // Given
            testUser.setIs2faEnabled(true);
            testUser.setBackupCodes(null);
            String backupCode = "ABCD1234EFGH";

            doNothing().when(rateLimitService).checkRateLimit(anyLong());
            doNothing().when(rateLimitService).recordFailedAttempt(anyLong());

            // When
            boolean result = twoFactorAuthService.verifyCodeForLogin(testUser, backupCode);

            // Then
            assertFalse(result);
            verify(rateLimitService).recordFailedAttempt(1L);
        }

        @Test
        @DisplayName("Should return false when backup codes are empty")
        void verifyCodeForLogin_WithEmptyBackupCodes_ShouldReturnFalse() {
            // Given
            testUser.setIs2faEnabled(true);
            testUser.setBackupCodes("[]");
            String backupCode = "ABCD1234EFGH";

            doNothing().when(rateLimitService).checkRateLimit(anyLong());
            doNothing().when(rateLimitService).recordFailedAttempt(anyLong());

            // When
            boolean result = twoFactorAuthService.verifyCodeForLogin(testUser, backupCode);

            // Then
            assertFalse(result);
            verify(rateLimitService).recordFailedAttempt(1L);
        }

        @Test
        @DisplayName("Should consume backup code after successful verification")
        void verifyCodeForLogin_WithValidBackupCode_ShouldConsumeCode() {
            // Given
            testUser.setIs2faEnabled(true);
            String backupCode = "ABCD1234EFGH";
            testUser.setBackupCodes("[\"hashedCode1\",\"hashedCode2\"]");

            doNothing().when(rateLimitService).checkRateLimit(anyLong());
            when(passwordEncoder.matches(eq(backupCode), eq("hashedCode1"))).thenReturn(true);
            when(userRepository.save(any(User.class))).thenReturn(testUser);
            doNothing().when(rateLimitService).recordSuccessfulAttempt(anyLong());

            // When
            boolean result = twoFactorAuthService.verifyCodeForLogin(testUser, backupCode);

            // Then
            assertTrue(result);
            verify(userRepository).save(any(User.class)); // Should save to remove used code
            verify(rateLimitService).recordSuccessfulAttempt(1L);
        }

        @Test
        @DisplayName("Should verify backup code when correct")
        void verifyCodeForLogin_WithValidBackupCode_ShouldReturnTrue() {
            // Given
            testUser.setIs2faEnabled(true);
            String backupCode = "ABCD1234EFGH"; // 12 characters
            testUser.setBackupCodes("[\"hashedCode1\"]");

            doNothing().when(rateLimitService).checkRateLimit(anyLong());
            when(passwordEncoder.matches(eq(backupCode), eq("hashedCode1"))).thenReturn(true);
            when(userRepository.save(any(User.class))).thenReturn(testUser);
            doNothing().when(rateLimitService).recordSuccessfulAttempt(anyLong());

            // When
            boolean result = twoFactorAuthService.verifyCodeForLogin(testUser, backupCode);

            // Then
            assertTrue(result);
            verify(rateLimitService).recordSuccessfulAttempt(1L);
        }

        @Test
        @DisplayName("Should return false for invalid backup code")
        void verifyCodeForLogin_WithInvalidBackupCode_ShouldReturnFalse() {
            // Given
            testUser.setIs2faEnabled(true);
            String invalidBackupCode = "INVALIDCODE1"; // 12 characters
            testUser.setBackupCodes("[\"hashedCode1\"]");

            doNothing().when(rateLimitService).checkRateLimit(anyLong());
            when(passwordEncoder.matches(eq(invalidBackupCode), anyString())).thenReturn(false);
            doNothing().when(rateLimitService).recordFailedAttempt(anyLong());

            // When
            boolean result = twoFactorAuthService.verifyCodeForLogin(testUser, invalidBackupCode);

            // Then
            assertFalse(result);
            verify(rateLimitService).recordFailedAttempt(1L);
        }
    }

    // ==================== DISABLE 2FA TESTS ====================

    @Nested
    @DisplayName("disable2FA Tests")
    class Disable2FATests {

        @Test
        @DisplayName("Should throw exception when 2FA not enabled")
        void disable2FA_When2FANotEnabled_ShouldThrowException() {
            // Given
            setupSecurityContext();
            testUser.setIs2faEnabled(false);

            when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(testUser));

            // When/Then
            BadRequestException exception = assertThrows(BadRequestException.class,
                    () -> twoFactorAuthService.disable2FA("password", "123456"));

            assertEquals("2FA is not enabled", exception.getMessage());
        }

        @Test
        @DisplayName("Should throw exception for wrong password")
        void disable2FA_WithWrongPassword_ShouldThrowException() {
            // Given
            setupSecurityContext();
            testUser.setIs2faEnabled(true);
            testUser.setPassword("encodedPassword");

            when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(testUser));
            when(passwordEncoder.matches("wrongPassword", "encodedPassword")).thenReturn(false);

            // When/Then
            BadRequestException exception = assertThrows(BadRequestException.class,
                    () -> twoFactorAuthService.disable2FA("wrongPassword", null));

            assertEquals("Invalid password", exception.getMessage());
        }

        @Test
        @DisplayName("Should disable 2FA with valid password")
        void disable2FA_WithValidPassword_ShouldDisable() {
            // Given
            setupSecurityContext();
            testUser.setIs2faEnabled(true);
            testUser.setPassword("encodedPassword");
            testUser.setTwoFactorSecret("secret");
            testUser.setBackupCodes("[\"code1\"]");

            when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(testUser));
            when(passwordEncoder.matches("correctPassword", "encodedPassword")).thenReturn(true);
            when(userRepository.save(any(User.class))).thenAnswer(inv -> {
                User user = inv.getArgument(0);
                return user;
            });

            // When
            TwoFactorStatusResponse result = twoFactorAuthService.disable2FA("correctPassword", null);

            // Then
            assertNotNull(result);
            assertFalse(result.isEnabled());
            verify(userRepository).save(argThat(user -> 
                !user.getIs2faEnabled() &&
                user.getTwoFactorSecret() == null &&
                user.getBackupCodes() == null
            ));
        }

        @Test
        @DisplayName("Should require code for OAuth2 user")
        void disable2FA_OAuth2UserWithoutCode_ShouldThrowException() {
            // Given
            setupSecurityContext();
            testUser.setIs2faEnabled(true);
            testUser.setPassword(null); // OAuth2 user has no password
            testUser.setProvider(AuthProvider.GOOGLE);

            when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(testUser));

            // When/Then
            BadRequestException exception = assertThrows(BadRequestException.class,
                    () -> twoFactorAuthService.disable2FA(null, null));

            assertEquals("2FA code is required to disable 2FA for OAuth2 accounts", exception.getMessage());
        }

        @Test
        @DisplayName("Should throw exception when password is null for local user")
        void disable2FA_LocalUserWithNullPassword_ShouldThrowException() {
            // Given
            setupSecurityContext();
            testUser.setIs2faEnabled(true);
            testUser.setPassword("encodedPassword");

            when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(testUser));

            // When/Then
            BadRequestException exception = assertThrows(BadRequestException.class,
                    () -> twoFactorAuthService.disable2FA(null, null));

            assertEquals("Password is required", exception.getMessage());
        }

        @Test
        @DisplayName("Should throw exception when password is empty for local user")
        void disable2FA_LocalUserWithEmptyPassword_ShouldThrowException() {
            // Given
            setupSecurityContext();
            testUser.setIs2faEnabled(true);
            testUser.setPassword("encodedPassword");

            when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(testUser));

            // When/Then
            BadRequestException exception = assertThrows(BadRequestException.class,
                    () -> twoFactorAuthService.disable2FA("", null));

            assertEquals("Password is required", exception.getMessage());
        }

        // Note: Testing disable with valid password and TOTP code requires actual TOTP verification
        // which is difficult to mock. The password-only path is tested in disable2FA_WithValidPassword_ShouldDisable
        // and OAuth2 code path is tested in disable2FA_OAuth2UserWithValidBackupCode_ShouldDisable

        @Test
        @DisplayName("Should disable 2FA for OAuth2 user with valid backup code")
        void disable2FA_OAuth2UserWithValidBackupCode_ShouldDisable() {
            // Given
            setupSecurityContext();
            testUser.setIs2faEnabled(true);
            testUser.setPassword(null);
            testUser.setProvider(AuthProvider.GOOGLE);
            testUser.setBackupCodes("[\"hashedCode1\"]");
            String backupCode = "ABCD1234EFGH";

            when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(testUser));
            doNothing().when(rateLimitService).checkRateLimit(anyLong());
            when(passwordEncoder.matches(eq(backupCode), eq("hashedCode1"))).thenReturn(true);
            doNothing().when(rateLimitService).recordSuccessfulAttempt(anyLong());
            when(userRepository.save(any(User.class))).thenAnswer(inv -> {
                User user = inv.getArgument(0);
                return user;
            });

            // When
            TwoFactorStatusResponse result = twoFactorAuthService.disable2FA(null, backupCode);

            // Then
            assertNotNull(result);
            assertFalse(result.isEnabled());
            verify(userRepository).save(argThat(user ->
                    !user.getIs2faEnabled() &&
                    user.getTwoFactorSecret() == null &&
                    user.getBackupCodes() == null
            ));
        }

        @Test
        @DisplayName("Should throw exception for OAuth2 user with invalid code")
        void disable2FA_OAuth2UserWithInvalidCode_ShouldThrowException() {
            // Given
            setupSecurityContext();
            testUser.setIs2faEnabled(true);
            testUser.setPassword(null);
            testUser.setProvider(AuthProvider.GOOGLE);
            testUser.setTwoFactorSecret("encryptedSecret");

            when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(testUser));
            doNothing().when(rateLimitService).checkRateLimit(anyLong());
            when(encryptionService.decrypt("encryptedSecret")).thenReturn("decryptedSecret");
            doNothing().when(rateLimitService).recordFailedAttempt(anyLong());

            // When/Then
            BadRequestException exception = assertThrows(BadRequestException.class,
                    () -> twoFactorAuthService.disable2FA(null, "000000"));

            assertEquals("Invalid 2FA code", exception.getMessage());
            verify(rateLimitService).recordFailedAttempt(1L);
        }
    }

    // ==================== GET 2FA STATUS TESTS ====================

    @Nested
    @DisplayName("get2FAStatus Tests")
    class Get2FAStatusTests {

        @Test
        @DisplayName("Should return enabled status with backup codes count")
        void get2FAStatus_When2FAEnabled_ShouldReturnEnabledStatus() {
            // Given
            setupSecurityContext();
            testUser.setIs2faEnabled(true);
            testUser.setBackupCodes("[\"code1\",\"code2\",\"code3\"]");

            when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(testUser));

            // When
            TwoFactorStatusResponse result = twoFactorAuthService.get2FAStatus();

            // Then
            assertTrue(result.isEnabled());
            assertEquals(3, result.getBackupCodesRemaining());
        }

        @Test
        @DisplayName("Should return disabled status when 2FA not enabled")
        void get2FAStatus_When2FANotEnabled_ShouldReturnDisabledStatus() {
            // Given
            setupSecurityContext();
            testUser.setIs2faEnabled(false);

            when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(testUser));

            // When
            TwoFactorStatusResponse result = twoFactorAuthService.get2FAStatus();

            // Then
            assertFalse(result.isEnabled());
        }

        @Test
        @DisplayName("Should return zero backup codes when backup codes are null")
        void get2FAStatus_WhenBackupCodesNull_ShouldReturnZero() {
            // Given
            setupSecurityContext();
            testUser.setIs2faEnabled(true);
            testUser.setBackupCodes(null);

            when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(testUser));

            // When
            TwoFactorStatusResponse result = twoFactorAuthService.get2FAStatus();

            // Then
            assertTrue(result.isEnabled());
            assertEquals(0, result.getBackupCodesRemaining());
        }

        @Test
        @DisplayName("Should return zero backup codes when backup codes are empty")
        void get2FAStatus_WhenBackupCodesEmpty_ShouldReturnZero() {
            // Given
            setupSecurityContext();
            testUser.setIs2faEnabled(true);
            testUser.setBackupCodes("[]");

            when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(testUser));

            // When
            TwoFactorStatusResponse result = twoFactorAuthService.get2FAStatus();

            // Then
            assertTrue(result.isEnabled());
            assertEquals(0, result.getBackupCodesRemaining());
        }

        @Test
        @DisplayName("Should throw exception when user not found")
        void get2FAStatus_WhenUserNotFound_ShouldThrowException() {
            // Given
            setupSecurityContext();
            when(userRepository.findByUsername("testuser")).thenReturn(Optional.empty());

            // When/Then
            assertThrows(ResourceNotFoundException.class,
                    () -> twoFactorAuthService.get2FAStatus());
        }
    }

    // ==================== REGENERATE BACKUP CODES TESTS ====================

    @Nested
    @DisplayName("regenerateBackupCodes Tests")
    class RegenerateBackupCodesTests {

        @Test
        @DisplayName("Should throw exception when 2FA not enabled")
        void regenerateBackupCodes_When2FANotEnabled_ShouldThrowException() {
            // Given
            setupSecurityContext();
            testUser.setIs2faEnabled(false);

            when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(testUser));

            // When/Then
            BadRequestException exception = assertThrows(BadRequestException.class,
                    () -> twoFactorAuthService.regenerateBackupCodes("password"));

            assertEquals("2FA is not enabled", exception.getMessage());
        }

        @Test
        @DisplayName("Should throw exception for wrong password")
        void regenerateBackupCodes_WithWrongPassword_ShouldThrowException() {
            // Given
            setupSecurityContext();
            testUser.setIs2faEnabled(true);
            testUser.setPassword("encodedPassword");

            when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(testUser));
            when(passwordEncoder.matches("wrongPassword", "encodedPassword")).thenReturn(false);

            // When/Then
            BadRequestException exception = assertThrows(BadRequestException.class,
                    () -> twoFactorAuthService.regenerateBackupCodes("wrongPassword"));

            assertEquals("Invalid password", exception.getMessage());
        }

        @Test
        @DisplayName("Should regenerate backup codes with valid password")
        void regenerateBackupCodes_WithValidPassword_ShouldReturnNewCodes() {
            // Given
            setupSecurityContext();
            testUser.setIs2faEnabled(true);
            testUser.setPassword("encodedPassword");

            when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(testUser));
            when(passwordEncoder.matches("correctPassword", "encodedPassword")).thenReturn(true);
            when(passwordEncoder.encode(anyString())).thenReturn("hashedCode");
            when(userRepository.save(any(User.class))).thenReturn(testUser);

            // When
            BackupCodesResponse result = twoFactorAuthService.regenerateBackupCodes("correctPassword");

            // Then
            assertNotNull(result);
            assertNotNull(result.getBackupCodes());
            assertEquals(5, result.getBackupCodes().size()); // BACKUP_CODES_COUNT = 5
            verify(userRepository).save(any(User.class));
        }

        @Test
        @DisplayName("Should throw exception when user not found")
        void regenerateBackupCodes_WhenUserNotFound_ShouldThrowException() {
            // Given
            setupSecurityContext();
            when(userRepository.findByUsername("testuser")).thenReturn(Optional.empty());

            // When/Then
            assertThrows(ResourceNotFoundException.class,
                    () -> twoFactorAuthService.regenerateBackupCodes("password"));
        }

        @Test
        @DisplayName("Should throw exception when password is null")
        void regenerateBackupCodes_WithNullPassword_ShouldThrowException() {
            // Given
            setupSecurityContext();
            testUser.setIs2faEnabled(true);
            testUser.setPassword("encodedPassword");

            when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(testUser));
            when(passwordEncoder.matches(null, "encodedPassword")).thenReturn(false);

            // When/Then
            BadRequestException exception = assertThrows(BadRequestException.class,
                    () -> twoFactorAuthService.regenerateBackupCodes(null));

            assertEquals("Invalid password", exception.getMessage());
        }
    }

    // ==================== SETUP 2FA - USER NOT FOUND TESTS ====================

    @Test
    @DisplayName("Should throw exception when user not found in setup2FA")
    void setup2FA_WhenUserNotFound_ShouldThrowException() {
        // Given
        setupSecurityContext();
        when(userRepository.findByUsername("testuser")).thenReturn(Optional.empty());

        // When/Then
        assertThrows(ResourceNotFoundException.class,
                () -> twoFactorAuthService.setup2FA());
    }
}
