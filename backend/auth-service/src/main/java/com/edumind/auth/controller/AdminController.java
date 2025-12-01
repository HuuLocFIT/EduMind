package com.edumind.auth.controller;

import com.edumind.auth.dto.request.CreateUserRequest;
import com.edumind.auth.dto.request.ReviewApplicationRequest;
import com.edumind.auth.dto.request.UpdateUserRoleRequest;
import com.edumind.auth.dto.request.UpgradeTrialRequest;
import com.edumind.auth.dto.response.TeacherApplicationResponse;
import com.edumind.auth.dto.response.TrialStatusResponse;
import com.edumind.auth.dto.response.UserListResponse;
import com.edumind.auth.service.AdminService;
import com.edumind.auth.service.TeacherApplicationService;
import com.edumind.common.response.ApiResponse;
import com.edumind.common.response.MessageResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/admin/users")
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {
    private static final Logger logger = LoggerFactory.getLogger(AdminController.class);

    @Autowired
    private AdminService adminService;

    @Autowired
    private TeacherApplicationService applicationService;

    /**
     * Admin creates TEACHER account
     * POST /admin/users/teacher
     */
    @PostMapping("/teacher")
    public ResponseEntity<MessageResponse> createTeacher(
            @Valid @RequestBody CreateUserRequest request,
            HttpServletRequest httpRequest) {

        logger.info("📥 POST /admin/users/teacher - Creating TEACHER account: {}", request.getUsername());

        MessageResponse response = adminService.createTeacher(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * Admin creates ADMIN account
     * POST /admin/users/admin
     */
    @PostMapping("/admin")
    public ResponseEntity<MessageResponse> createAdmin(
            @Valid @RequestBody CreateUserRequest request,
            HttpServletRequest httpRequest) {

        logger.info("📥 POST /admin/users/admin - Creating ADMIN account: {}", request.getUsername());

        MessageResponse response = adminService.createAdmin(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * Get all users with pagination
     * GET /admin/users?page=0&size=10&sortBy=createdAt
     */
    @GetMapping
    public ResponseEntity<ApiResponse<Page<UserListResponse>>> getAllUsers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy) {

        logger.info("📥 GET /admin/users - Fetching all users");

        Page<UserListResponse> users = adminService.getAllUsers(page, size, sortBy);

        ApiResponse<Page<UserListResponse>> response = ApiResponse.<Page<UserListResponse>>builder()
                .status(HttpStatus.OK.value())
                .success(true)
                .message("Users retrieved successfully")
                .data(users)
                .build();

        return ResponseEntity.ok(response);
    }

    /**
     * Get users by role
     * GET /admin/users/role/{roleName}?page=0&size=10
     */
    @GetMapping("/role/{roleName}")
    public ResponseEntity<ApiResponse<Page<UserListResponse>>> getUsersByRole(
            @PathVariable String roleName,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {

        logger.info("📥 GET /admin/users/role/{} - Fetching users", roleName);

        Page<UserListResponse> users = adminService.getUsersByRole(roleName.toUpperCase(), page, size);

        ApiResponse<Page<UserListResponse>> response = ApiResponse.<Page<UserListResponse>>builder()
                .status(HttpStatus.OK.value())
                .success(true)
                .message("Users with role " + roleName + " retrieved successfully")
                .data(users)
                .build();

        return ResponseEntity.ok(response);
    }

    /**
     * Update user roles
     * PUT /admin/users/{userId}/role
     */
    @PutMapping("/{userId}/role")
    public ResponseEntity<MessageResponse> updateUserRoles(
            @PathVariable Long userId,
            @Valid @RequestBody UpdateUserRoleRequest request) {

        logger.info("📥 PUT /admin/users/{}/role - Updating roles", userId);

        MessageResponse response = adminService.updateUserRoles(userId, request);
        return ResponseEntity.ok(response);
    }

    /**
     * Enable/Disable user
     * PATCH /admin/users/{userId}/status?enabled=true
     */
    @PatchMapping("/{userId}/status")
    public ResponseEntity<MessageResponse> toggleUserStatus(
            @PathVariable Long userId,
            @RequestParam boolean enabled) {

        logger.info("📥 PATCH /admin/users/{}/status - Setting enabled={}", userId, enabled);

        MessageResponse response = adminService.toggleUserStatus(userId, enabled);
        return ResponseEntity.ok(response);
    }

    /**
     * Delete user (soft delete)
     * DELETE /admin/users/{userId}
     */
    @DeleteMapping("/{userId}")
    public ResponseEntity<MessageResponse> deleteUser(@PathVariable Long userId) {

        logger.info("📥 DELETE /admin/users/{} - Deleting user", userId);

        MessageResponse response = adminService.deleteUser(userId);
        return ResponseEntity.ok(response);
    }

    /**
     * Get all teacher applications
     * GET /admin/applications?status=PENDING&page=0&size=10
     */
    @GetMapping("/applications")
    public ResponseEntity<ApiResponse<Page<TeacherApplicationResponse>>> getAllApplications(
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy) {

        logger.info("📥 GET /admin/applications - Fetching applications with status: {}", status);

        Page<TeacherApplicationResponse> applications =
                applicationService.getAllApplications(status, page, size, sortBy);

        ApiResponse<Page<TeacherApplicationResponse>> response =
                ApiResponse.<Page<TeacherApplicationResponse>>builder()
                        .status(HttpStatus.OK.value())
                        .success(true)
                        .message("Applications retrieved successfully")
                        .data(applications)
                        .build();

        return ResponseEntity.ok(response);
    }

    /**
     * Get specific application details
     * GET /admin/applications/{id}
     */
    @GetMapping("/applications/{id}")
    public ResponseEntity<ApiResponse<TeacherApplicationResponse>> getApplicationById(
            @PathVariable Long id) {

        logger.info("📥 GET /admin/applications/{} - Fetching application details", id);

        // This would need to be implemented in service
        // For now, placeholder

        return ResponseEntity.ok(ApiResponse.<TeacherApplicationResponse>builder()
                .status(HttpStatus.OK.value())
                .success(true)
                .message("Application retrieved")
                .build());
    }

    /**
     * Review application (Approve or Reject)
     * POST /admin/applications/{id}/review
     */
    @PostMapping("/applications/{id}/review")
    public ResponseEntity<MessageResponse> reviewApplication(
            @PathVariable Long id,
            @Valid @RequestBody ReviewApplicationRequest request) {

        logger.info("📥 POST /admin/applications/{}/review - Action: {}", id, request.getAction());

        MessageResponse response = applicationService.reviewApplication(id, request);
        return ResponseEntity.ok(response);
    }

    /**
     * Get all trial teachers
     * GET /admin/trial-teachers?page=0&size=10
     */
    @GetMapping("/trial-teachers")
    public ResponseEntity<ApiResponse<Page<TrialStatusResponse>>> getTrialTeachers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {

        logger.info("📥 GET /admin/trial-teachers - Fetching trial teachers");

        Page<TrialStatusResponse> trialTeachers = applicationService.getTrialTeachers(page, size);

        ApiResponse<Page<TrialStatusResponse>> response =
                ApiResponse.<Page<TrialStatusResponse>>builder()
                        .status(HttpStatus.OK.value())
                        .success(true)
                        .message("Trial teachers retrieved successfully")
                        .data(trialTeachers)
                        .build();

        return ResponseEntity.ok(response);
    }

    /**
     * Upgrade trial teacher to full teacher
     * POST /admin/trial-teachers/{userId}/upgrade
     */
    @PostMapping("/trial-teachers/{userId}/upgrade")
    public ResponseEntity<MessageResponse> upgradeTrialToFull(
            @PathVariable Long userId,
            @RequestBody(required = false) UpgradeTrialRequest request) {

        logger.info("📥 POST /admin/trial-teachers/{}/upgrade - Upgrading to full teacher", userId);

        if (request == null) {
            request = new UpgradeTrialRequest();
        }

        MessageResponse response = applicationService.upgradeTrialToFull(userId, request);
        return ResponseEntity.ok(response);
    }
}
