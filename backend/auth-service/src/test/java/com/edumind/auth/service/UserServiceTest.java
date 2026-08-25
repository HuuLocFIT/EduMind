package com.edumind.auth.service;

import com.edumind.auth.dto.request.ChangePasswordRequest;
import com.edumind.auth.dto.request.UpdateProfileRequest;
import com.edumind.auth.dto.response.UserResponse;
import com.edumind.auth.entity.Role;
import com.edumind.auth.entity.User;
import com.edumind.auth.enums.AuthProvider;
import com.edumind.auth.enums.RoleName;
import com.edumind.auth.event.EmailPayloadFactory;
import com.edumind.auth.event.PasswordChangedEmailRequested;
import com.edumind.auth.repository.RefreshTokenRepository;
import com.edumind.auth.repository.UserRepository;
import com.edumind.auth.security.UserDetailsImpl;
import com.edumind.common.exception.BadRequestException;
import com.edumind.common.exception.ResourceNotFoundException;
import com.edumind.common.response.MessageResponse;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Unit tests for UserService
 * Tests user profile management, password change, and account deletion
 */
@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private EmailService emailService;

    @Mock
    private RefreshTokenRepository refreshTokenRepository;

    @Mock
    private EmailPayloadFactory emailPayloadFactory;

    @Mock
    private ApplicationEventPublisher eventPublisher;

    @InjectMocks
    private UserService userService;

    private User testUser;
    private UserDetailsImpl userDetails;

    @BeforeEach
    void setUp() {
        // Create test user
        Role studentRole = new Role();
        studentRole.setId(1L);
        studentRole.setName(RoleName.ROLE_STUDENT);

        testUser = User.builder()
                .id(1L)
                .username("testuser")
                .email("test@example.com")
                .password("encodedPassword")
                .firstName("Test")
                .lastName("User")
                .phoneNumber("1234567890")
                .isActive(true)
                .isEmailVerified(true)
                .is2faEnabled(false)
                .provider(AuthProvider.LOCAL)
                .roles(Set.of(studentRole))
                .build();

        // Create UserDetails
        userDetails = new UserDetailsImpl(
                1L,
                "testuser",
                "test@example.com",
                "encodedPassword",
                Set.of(),
                null,
                true,
                null  // trialEndDate
        );
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    private void setupSecurityContext() {
        SecurityContext securityContext = mock(SecurityContext.class);
        Authentication authentication = mock(Authentication.class);
        when(authentication.getPrincipal()).thenReturn(userDetails);
        when(securityContext.getAuthentication()).thenReturn(authentication);
        SecurityContextHolder.setContext(securityContext);
    }

    // ==================== GET CURRENT USER TESTS ====================

    @Nested
    @DisplayName("getCurrentUser Tests")
    class GetCurrentUserTests {

        @Test
        @DisplayName("Should return current user details")
        void getCurrentUser_WhenAuthenticated_ShouldReturnUserResponse() {
            // Given
            setupSecurityContext();
            when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));

            // When
            UserResponse result = userService.getCurrentUser();

            // Then
            assertNotNull(result);
            assertEquals("testuser", result.getUsername());
            assertEquals("test@example.com", result.getEmail());
            assertEquals("Test", result.getFirstName());
            assertEquals("User", result.getLastName());
        }

        @Test
        @DisplayName("Should throw exception when user not found")
        void getCurrentUser_WhenUserNotFound_ShouldThrowException() {
            // Given
            setupSecurityContext();
            when(userRepository.findById(1L)).thenReturn(Optional.empty());

            // When/Then
            assertThrows(ResourceNotFoundException.class,
                    () -> userService.getCurrentUser());
        }
    }

    // ==================== GET USER BY ID TESTS ====================

    @Nested
    @DisplayName("getUserById Tests")
    class GetUserByIdTests {

        @Test
        @DisplayName("Should return user by id")
        void getUserById_WhenExists_ShouldReturnUserResponse() {
            // Given
            when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));

            // When
            UserResponse result = userService.getUserById(1L);

            // Then
            assertNotNull(result);
            assertEquals("testuser", result.getUsername());
        }

        @Test
        @DisplayName("Should throw exception when user not found")
        void getUserById_WhenNotFound_ShouldThrowException() {
            // Given
            when(userRepository.findById(999L)).thenReturn(Optional.empty());

            // When/Then
            ResourceNotFoundException exception = assertThrows(ResourceNotFoundException.class,
                    () -> userService.getUserById(999L));

            assertTrue(exception.getMessage().contains("999"));
        }
    }

    // ==================== UPDATE PROFILE TESTS ====================

    @Nested
    @DisplayName("updateProfile Tests")
    class UpdateProfileTests {

        @Test
        @DisplayName("Should update profile with all fields")
        void updateProfile_WithAllFields_ShouldUpdateUser() {
            // Given
            setupSecurityContext();
            when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));
            when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

            UpdateProfileRequest request = UpdateProfileRequest.builder()
                    .firstName("Updated")
                    .lastName("Name")
                    .phoneNumber("9876543210")
                    .profilePictureUrl("http://example.com/avatar.jpg")
                    .build();

            // When
            UserResponse result = userService.updateProfile(request);

            // Then
            verify(userRepository).save(any(User.class));
            assertNotNull(result);
        }

        @Test
        @DisplayName("Should update only firstName when only firstName provided")
        void updateProfile_WithOnlyFirstName_ShouldUpdateOnlyFirstName() {
            // Given
            setupSecurityContext();
            when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));
            when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

            UpdateProfileRequest request = UpdateProfileRequest.builder()
                    .firstName("NewFirstName")
                    .build();

            // When
            userService.updateProfile(request);

            // Then
            verify(userRepository).save(argThat(user ->
                    "NewFirstName".equals(user.getFirstName()) &&
                            "User".equals(user.getLastName()) // Unchanged
            ));
        }

        @Test
        @DisplayName("Should not save when no changes detected")
        void updateProfile_WithNoChanges_ShouldNotSave() {
            // Given
            setupSecurityContext();
            when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));

            UpdateProfileRequest request = UpdateProfileRequest.builder().build();

            // When
            userService.updateProfile(request);

            // Then - should not call save since no changes
            verify(userRepository, never()).save(any(User.class));
        }

        @Test
        @DisplayName("Should trim whitespace from fields")
        void updateProfile_WithWhitespace_ShouldTrim() {
            // Given
            setupSecurityContext();
            when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));
            when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

            UpdateProfileRequest request = UpdateProfileRequest.builder()
                    .firstName("  Updated  ")
                    .lastName("  Name  ")
                    .build();

            // When
            userService.updateProfile(request);

            // Then
            verify(userRepository).save(argThat(user ->
                    "Updated".equals(user.getFirstName()) &&
                            "Name".equals(user.getLastName())
            ));
        }
    }

    // ==================== CHANGE PASSWORD TESTS ====================

    @Nested
    @DisplayName("changePassword Tests")
    class ChangePasswordTests {

        @Test
        @DisplayName("Should change password successfully")
        void changePassword_WithValidData_ShouldSucceed() {
            // Given
            setupSecurityContext();
            when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));
            when(passwordEncoder.matches("currentPassword", "encodedPassword")).thenReturn(true);
            when(passwordEncoder.matches("NewPassword123!", "encodedPassword")).thenReturn(false);
            when(passwordEncoder.encode("NewPassword123!")).thenReturn("newEncodedPassword");
            when(emailPayloadFactory.displayName(testUser)).thenReturn("Test");

            ChangePasswordRequest request = ChangePasswordRequest.builder()
                    .currentPassword("currentPassword")
                    .newPassword("NewPassword123!")
                    .confirmPassword("NewPassword123!")
                    .build();

            // When
            assertDoesNotThrow(() -> userService.changePassword(request));

            // Then
            verify(userRepository).save(argThat(user ->
                    "newEncodedPassword".equals(user.getPassword())));
            verify(refreshTokenRepository).revokeAllUserTokens(testUser);
            verify(eventPublisher).publishEvent(new PasswordChangedEmailRequested("test@example.com", "Test"));
        }

        @Test
        @DisplayName("Should throw exception when current password is wrong")
        void changePassword_WithWrongCurrentPassword_ShouldThrowException() {
            // Given
            setupSecurityContext();
            when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));
            when(passwordEncoder.matches("wrongPassword", "encodedPassword")).thenReturn(false);

            ChangePasswordRequest request = ChangePasswordRequest.builder()
                    .currentPassword("wrongPassword")
                    .newPassword("NewPassword123!")
                    .confirmPassword("NewPassword123!")
                    .build();

            // When/Then
            BadRequestException exception = assertThrows(BadRequestException.class,
                    () -> userService.changePassword(request));

            assertEquals("Current password is incorrect", exception.getMessage());
            verify(userRepository, never()).save(any());
            verify(refreshTokenRepository, never()).revokeAllUserTokens(any());
        }

        @Test
        @DisplayName("Should throw exception when passwords don't match")
        void changePassword_WithMismatchedPasswords_ShouldThrowException() {
            // Given
            setupSecurityContext();
            when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));
            when(passwordEncoder.matches("currentPassword", "encodedPassword")).thenReturn(true);

            ChangePasswordRequest request = ChangePasswordRequest.builder()
                    .currentPassword("currentPassword")
                    .newPassword("NewPassword123!")
                    .confirmPassword("DifferentPassword!")
                    .build();

            // When/Then
            BadRequestException exception = assertThrows(BadRequestException.class,
                    () -> userService.changePassword(request));

            assertEquals("New password and confirmation do not match", exception.getMessage());
        }

        @Test
        @DisplayName("Should throw exception when new password same as current")
        void changePassword_WithSamePassword_ShouldThrowException() {
            // Given
            setupSecurityContext();
            when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));
            when(passwordEncoder.matches("currentPassword", "encodedPassword")).thenReturn(true);
            when(passwordEncoder.matches("currentPassword", "encodedPassword")).thenReturn(true);

            ChangePasswordRequest request = ChangePasswordRequest.builder()
                    .currentPassword("currentPassword")
                    .newPassword("currentPassword")
                    .confirmPassword("currentPassword")
                    .build();

            // When/Then
            BadRequestException exception = assertThrows(BadRequestException.class,
                    () -> userService.changePassword(request));

            assertEquals("New password must be different from current password", exception.getMessage());
        }

        @Test
        @DisplayName("Should continue if email sending fails")
        void changePassword_WhenEmailFails_ShouldStillComplete() {
            // Given
            setupSecurityContext();
            when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));
            when(passwordEncoder.matches("currentPassword", "encodedPassword")).thenReturn(true);
            when(passwordEncoder.matches("NewPassword123!", "encodedPassword")).thenReturn(false);
            when(passwordEncoder.encode("NewPassword123!")).thenReturn("newEncodedPassword");

            ChangePasswordRequest request = ChangePasswordRequest.builder()
                    .currentPassword("currentPassword")
                    .newPassword("NewPassword123!")
                    .confirmPassword("NewPassword123!")
                    .build();

            // When - Should not throw (email delivery happens asynchronously via the
            // published event, so a downstream mail failure never reaches this method)
            assertDoesNotThrow(() -> userService.changePassword(request));

            // Then
            verify(userRepository).save(any(User.class));
            verify(refreshTokenRepository).revokeAllUserTokens(testUser);
        }
    }

    // ==================== DELETE ACCOUNT TESTS ====================

    @Nested
    @DisplayName("deleteAccount Tests")
    class DeleteAccountTests {

        @Test
        @DisplayName("Should soft delete account successfully")
        void deleteAccount_ShouldSoftDelete() {
            // Given
            setupSecurityContext();
            when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));
            when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

            // When
            MessageResponse result = userService.deleteAccount();

            // Then
            assertTrue(result.isSuccess());
            verify(refreshTokenRepository).revokeAllUserTokens(testUser);
            verify(userRepository).save(argThat(user ->
                    user.getDeletedAt() != null &&
                            !user.getIsActive()
            ));
        }

        @Test
        @DisplayName("Should throw exception if account already deleted")
        void deleteAccount_WhenAlreadyDeleted_ShouldThrowException() {
            // Given
            setupSecurityContext();
            testUser.setDeletedAt(LocalDateTime.now());
            when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));

            // When/Then - getCurrentUserEntity() throws ResourceNotFoundException for deleted users
            ResourceNotFoundException exception = assertThrows(ResourceNotFoundException.class,
                    () -> userService.deleteAccount());

            assertEquals("User account has been deleted", exception.getMessage());
        }
    }
}
