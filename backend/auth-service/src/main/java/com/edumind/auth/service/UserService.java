package com.edumind.auth.service;

import com.edumind.auth.dto.request.ChangePasswordRequest;
import com.edumind.auth.dto.request.UpdateProfileRequest;
import com.edumind.auth.dto.response.UserResponse;
import com.edumind.auth.entity.User;
import com.edumind.auth.event.AccountDeletedEmailRequested;
import com.edumind.auth.event.EmailPayloadFactory;
import com.edumind.auth.event.PasswordChangedEmailRequested;
import com.edumind.auth.repository.RefreshTokenRepository;
import com.edumind.auth.repository.UserRepository;
import com.edumind.auth.security.UserDetailsImpl;
import com.edumind.auth.util.UserMapper;
import com.edumind.common.exception.BadRequestException;
import com.edumind.common.exception.ResourceNotFoundException;
import com.edumind.common.response.MessageResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
public class UserService {
    private static final Logger logger = LoggerFactory.getLogger(UserService.class);

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private ApplicationEventPublisher eventPublisher;

    @Autowired
    private EmailPayloadFactory emailPayloadFactory;

    @Autowired
    private RefreshTokenRepository refreshTokenRepository;

    @Transactional(readOnly = true)
    public UserResponse getCurrentUser() {
        logger.info("👤 Getting current user details");

        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder
                .getContext()
                .getAuthentication()
                .getPrincipal();

        User user = userRepository.findById(userDetails.getId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        return UserMapper.toUserResponse(user);
    }

    @Transactional(readOnly = true)
    public UserResponse getUserById(Long id) {
        logger.info("👤 Getting user by id: {}", id);

        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + id));

        return UserMapper.toUserResponse(user);
    }

    /**
     * Update current user's profile
     * Only updates fields that are provided (non-null)
     *
     * @param request UpdateProfileRequest with fields to update
     * @return Updated UserResponse
     */
    @Transactional
    public UserResponse updateProfile(UpdateProfileRequest request) {
        logger.info("✏️ Updating user profile");

        User user = getCurrentUserEntity();
        boolean updated = false;

        // Update firstName if provided
        if (request.getFirstName() != null && !request.getFirstName().isBlank()) {
            user.setFirstName(request.getFirstName().trim());
            updated = true;
            logger.debug("Updated firstName to: {}", request.getFirstName());
        }

        // Update lastName if provided
        if (request.getLastName() != null && !request.getLastName().isBlank()) {
            user.setLastName(request.getLastName().trim());
            updated = true;
            logger.debug("Updated lastName to: {}", request.getLastName());
        }

        // Update phoneNumber if provided
        if (request.getPhoneNumber() != null) {
            user.setPhoneNumber(request.getPhoneNumber().trim());
            updated = true;
            logger.debug("Updated phoneNumber");
        }

        // if (request.getBio() != null) {
        // user.setBio(request.getBio().trim());
        // updated = true;
        // }

        // Update profilePictureUrl if provided
        if (request.getProfilePictureUrl() != null) {
            user.setProfilePictureUrl(request.getProfilePictureUrl().trim());
            updated = true;
            logger.debug("Updated profilePictureUrl");
        }

        if (updated) {
            user = userRepository.save(user);
            logger.info("✅ Profile updated successfully for user: {}", user.getUsername());
        } else {
            logger.info("ℹ️ No changes detected for user: {}", user.getUsername());
        }

        return UserMapper.toUserResponse(user);
    }

    /**
     * Change password for current user
     * Requires current password for verification
     *
     * @param request ChangePasswordRequest with current and new password
     */
    @Transactional
    public void changePassword(ChangePasswordRequest request) {
        logger.info("🔐 Changing password for current user");

        User user = getCurrentUserEntity();

        // Validate current password
        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPassword())) {
            logger.error("❌ Current password is incorrect for user: {}", user.getUsername());
            throw new BadRequestException("Current password is incorrect");
        }

        // Validate new password confirmation
        if (!request.getNewPassword().equals(request.getConfirmPassword())) {
            logger.error("❌ Password confirmation does not match");
            throw new BadRequestException("New password and confirmation do not match");
        }

        // Check that new password is different from current
        if (passwordEncoder.matches(request.getNewPassword(), user.getPassword())) {
            logger.error("❌ New password must be different from current password");
            throw new BadRequestException("New password must be different from current password");
        }

        // Update password
        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);
        refreshTokenRepository.revokeAllUserTokens(user);

        logger.info("✅ Password changed successfully for user: {}", user.getUsername());

        eventPublisher.publishEvent(new PasswordChangedEmailRequested(
                user.getEmail(), emailPayloadFactory.displayName(user)));
    }

    /**
     * Soft delete current user's account
     * This will:
     * 1. Revoke all refresh tokens associated with the user
     * 2. Set deletedAt timestamp and isActive = false (soft delete)
     * 3. Keep retained data in its current soft-deleted state
     */
    @Transactional
    public MessageResponse deleteAccount() {
        logger.info("🗑️ Soft deleting current user account");

        User user = getCurrentUserEntity();

        // Check if already deleted
        if (user.isDeleted()) {
            logger.warn("⚠️ User account already deleted: {}", user.getUsername());
            throw new BadRequestException("Account is already deleted");
        }

        Long userId = user.getId();
        String username = user.getUsername();
        AccountDeletedEmailRequested emailEvent = new AccountDeletedEmailRequested(
                user.getEmail(), emailPayloadFactory.displayName(user));

        // Revoke all refresh tokens for this user
        refreshTokenRepository.revokeAllUserTokens(user);
        logger.info("✅ Revoked all refresh tokens for user: {}", username);

        // Soft delete: set deletedAt and deactivate account
        user.setDeletedAt(LocalDateTime.now());
        user.setIsActive(false);
        user = userRepository.save(user);

        logger.info("✅ User account soft deleted successfully: {} (ID: {})", username, userId);
        eventPublisher.publishEvent(emailEvent);

        return MessageResponse.builder()
                .status(HttpStatus.OK.value())
                .success(true)
                .message("Account deleted successfully.")
                .build();
    }

    private User getCurrentUserEntity() {
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder
                .getContext()
                .getAuthentication()
                .getPrincipal();

        User user = userRepository.findById(userDetails.getId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        // Check if user is deleted (should not happen for authenticated users, but
        // safety check)
        if (user.isDeleted()) {
            throw new ResourceNotFoundException("User account has been deleted");
        }

        return user;
    }
}
