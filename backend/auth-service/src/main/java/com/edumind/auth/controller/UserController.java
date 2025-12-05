package com.edumind.auth.controller;

import com.edumind.auth.dto.request.ChangePasswordRequest;
import com.edumind.auth.dto.request.UpdateProfileRequest;
import com.edumind.auth.dto.response.PublicUserProfileResponse;
import com.edumind.auth.dto.response.UserResponse;
import com.edumind.auth.service.UserService;
import com.edumind.common.response.ApiResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/users")
public class UserController {
    private static final Logger logger = LoggerFactory.getLogger(UserController.class);

    @Autowired
    private UserService userService;

    /**
     * Get current authenticated user details
     * GET /users/me
     */
    @GetMapping("/me")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<UserResponse>> getCurrentUser(HttpServletRequest request) {
        logger.info("📥 GET /users/me - Get current user");

        UserResponse userResponse = userService.getCurrentUser();

        ApiResponse<UserResponse> response = ApiResponse.<UserResponse>builder()
                .status(HttpStatus.OK.value())
                .success(true)
                .message("User details retrieved successfully")
                .data(userResponse)
                .path(request.getRequestURI())
                .build();

        return ResponseEntity.ok(response);
    }

    /**
     * Get user by ID (Admin/Teacher only)
     * GET /users/{id}
     */
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    public ResponseEntity<ApiResponse<UserResponse>> getUserById(
            @PathVariable Long id,
            HttpServletRequest request) {

        logger.info("📥 GET /users/{} - Get user by id", id);

        UserResponse userResponse = userService.getUserById(id);

        ApiResponse<UserResponse> response = ApiResponse.<UserResponse>builder()
                .status(HttpStatus.OK.value())
                .success(true)
                .message("User details retrieved successfully")
                .data(userResponse)
                .path(request.getRequestURI())
                .build();

        return ResponseEntity.ok(response);
    }

    /**
     * Get user public profile by ID (Public endpoint for displaying user info)
     * GET /users/{id}/public-profile
     */
    @GetMapping("/{id}/public-profile")
    public ResponseEntity<ApiResponse<PublicUserProfileResponse>> getUserPublicProfile(
            @PathVariable Long id,
            HttpServletRequest request) {

        logger.info("📥 GET /users/{}/public-profile - Get user public profile", id);

        UserResponse user = userService.getUserById(id);

        // Build safe public profile
        String displayName = null;
        if (user.getFirstName() != null || user.getLastName() != null) {
            displayName = String.format("%s %s",
                    user.getFirstName() != null ? user.getFirstName() : "",
                    user.getLastName() != null ? user.getLastName() : "").trim();
            if (displayName.isBlank()) {
                displayName = null;
            }
        }

        PublicUserProfileResponse publicProfile = PublicUserProfileResponse.builder()
                .id(user.getId())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .displayName(displayName)
                .avatarUrl(user.getAvatarUrl())
                .profilePictureUrl(user.getProfilePictureUrl())
                .bio(user.getBio())
                .build();

        ApiResponse<PublicUserProfileResponse> response = ApiResponse
                .<PublicUserProfileResponse>builder()
                .status(HttpStatus.OK.value())
                .success(true)
                .message("User profile retrieved successfully")
                .data(publicProfile)
                .path(request.getRequestURI())
                .build();

        return ResponseEntity.ok(response);
    }

    @PutMapping("/me")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<UserResponse>> updateProfile(
            @Valid @RequestBody UpdateProfileRequest request) {

        logger.info("📥 PUT /users/me - Update profile");

        UserResponse userResponse = userService.updateProfile(request);

        return ResponseEntity.ok(
                ApiResponse.success("Profile updated successfully", userResponse)
        );
    }

    @PostMapping("/me/change-password")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<String>> changePassword(
            @Valid @RequestBody ChangePasswordRequest request) {

        logger.info("📥 POST /users/me/change-password - Change password");

        userService.changePassword(request);

        return ResponseEntity.ok(
                ApiResponse.success("Password changed successfully", null)
        );
    }
}
