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
import com.edumind.common.response.PagedResponse;
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
    public ResponseEntity<ApiResponse<Void>> createTeacher(
            @Valid @RequestBody CreateUserRequest request,
            HttpServletRequest httpRequest) {

        logger.info("📥 POST /admin/users/teacher - Creating TEACHER account: {}", request.getUsername());

        MessageResponse response = adminService.createTeacher(request);
        ApiResponse<Void> apiResponse = ApiResponse.<Void>builder()
                .status(response.getStatus())
                .success(response.isSuccess())
                .message(response.getMessage())
                .path(httpRequest.getRequestURI())
                .build();

        return ResponseEntity.status(response.getStatus()).body(apiResponse);
    }

    /**
     * Admin creates ADMIN account
     * POST /admin/users/admin
     */
    @PostMapping("/admin")
    public ResponseEntity<ApiResponse<Void>> createAdmin(
            @Valid @RequestBody CreateUserRequest request,
            HttpServletRequest httpRequest) {

        logger.info("📥 POST /admin/users/admin - Creating ADMIN account: {}", request.getUsername());

        MessageResponse response = adminService.createAdmin(request);
        ApiResponse<Void> apiResponse = ApiResponse.<Void>builder()
                .status(response.getStatus())
                .success(response.isSuccess())
                .message(response.getMessage())
                .path(httpRequest.getRequestURI())
                .build();

        return ResponseEntity.status(response.getStatus()).body(apiResponse);
    }

    /**
     * Get all users with pagination
     * GET /admin/users?page=0&size=10&sortBy=createdAt
     */
    @GetMapping
    public ResponseEntity<PagedResponse<UserListResponse>> getAllUsers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            HttpServletRequest request) {

        logger.info("📥 GET /admin/users - Fetching all users");

        Page<UserListResponse> users = adminService.getAllUsers(page, size, sortBy);

        PagedResponse<UserListResponse> response = PagedResponse.of(
                users.getContent(),
                users.getNumber(),
                users.getSize(),
                users.getTotalElements(),
                users.getTotalPages()
        );
        response.setMessage("Users retrieved successfully");
        response.setPath(request.getRequestURI());

        return ResponseEntity.ok(response);
    }

    /**
     * Get users by role
     * GET /admin/users/role/{roleName}?page=0&size=10
     */
    @GetMapping("/role/{roleName}")
    public ResponseEntity<PagedResponse<UserListResponse>> getUsersByRole(
            @PathVariable String roleName,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            HttpServletRequest request) {

        logger.info("📥 GET /admin/users/role/{} - Fetching users", roleName);

        Page<UserListResponse> users = adminService.getUsersByRole(roleName.toUpperCase(), page, size);

        PagedResponse<UserListResponse> response = PagedResponse.of(
                users.getContent(),
                users.getNumber(),
                users.getSize(),
                users.getTotalElements(),
                users.getTotalPages()
        );
        response.setMessage("Users with role " + roleName + " retrieved successfully");
        response.setPath(request.getRequestURI());

        return ResponseEntity.ok(response);
    }

    /**
     * Update user roles
     * PUT /admin/users/{userId}/role
     */
    @PutMapping("/{userId}/role")
    public ResponseEntity<ApiResponse<Void>> updateUserRoles(
            @PathVariable Long userId,
            @Valid @RequestBody UpdateUserRoleRequest request,
            HttpServletRequest httpRequest) {

        logger.info("📥 PUT /admin/users/{}/role - Updating roles", userId);

        MessageResponse response = adminService.updateUserRoles(userId, request);
        ApiResponse<Void> apiResponse = ApiResponse.<Void>builder()
                .status(response.getStatus())
                .success(response.isSuccess())
                .message(response.getMessage())
                .path(httpRequest.getRequestURI())
                .build();

        return ResponseEntity.status(response.getStatus()).body(apiResponse);
    }

    /**
     * Enable/Disable user
     * PATCH /admin/users/{userId}/status?enabled=true
     */
    @PatchMapping("/{userId}/status")
    public ResponseEntity<ApiResponse<Void>> toggleUserStatus(
            @PathVariable Long userId,
            @RequestParam boolean enabled,
            HttpServletRequest httpRequest) {

        logger.info("📥 PATCH /admin/users/{}/status - Setting enabled={}", userId, enabled);

        MessageResponse response = adminService.toggleUserStatus(userId, enabled);
        ApiResponse<Void> apiResponse = ApiResponse.<Void>builder()
                .status(response.getStatus())
                .success(response.isSuccess())
                .message(response.getMessage())
                .path(httpRequest.getRequestURI())
                .build();

        return ResponseEntity.status(response.getStatus()).body(apiResponse);
    }

    /**
     * Delete user (soft delete)
     * DELETE /admin/users/{userId}
     */
    @DeleteMapping("/{userId}")
    public ResponseEntity<ApiResponse<Void>> deleteUser(
            @PathVariable Long userId,
            HttpServletRequest httpRequest) {

        logger.info("📥 DELETE /admin/users/{} - Deleting user", userId);

        MessageResponse response = adminService.deleteUser(userId);
        ApiResponse<Void> apiResponse = ApiResponse.<Void>builder()
                .status(response.getStatus())
                .success(response.isSuccess())
                .message(response.getMessage())
                .path(httpRequest.getRequestURI())
                .build();

        return ResponseEntity.status(response.getStatus()).body(apiResponse);
    }

    /**
     * Get all teacher applications
     * GET /admin/applications?status=PENDING&page=0&size=10
     */
    @GetMapping("/applications")
    public ResponseEntity<PagedResponse<TeacherApplicationResponse>> getAllApplications(
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            HttpServletRequest request) {

        logger.info("📥 GET /admin/applications - Fetching applications with status: {}", status);

        Page<TeacherApplicationResponse> applications =
                applicationService.getAllApplications(status, page, size, sortBy);

        PagedResponse<TeacherApplicationResponse> response =
                PagedResponse.of(
                        applications.getContent(),
                        applications.getNumber(),
                        applications.getSize(),
                        applications.getTotalElements(),
                        applications.getTotalPages()
                );
        response.setMessage("Applications retrieved successfully");
        response.setPath(request.getRequestURI());

        return ResponseEntity.ok(response);
    }

    /**
     * Get specific application details
     * GET /admin/applications/{id}
     */
    @GetMapping("/applications/{id}")
    public ResponseEntity<ApiResponse<TeacherApplicationResponse>> getApplicationById(
            @PathVariable Long id,
            HttpServletRequest request) {

        logger.info("📥 GET /admin/applications/{} - Fetching application details", id);

        TeacherApplicationResponse application = applicationService.getApplicationById(id);

        ApiResponse<TeacherApplicationResponse> response = ApiResponse.<TeacherApplicationResponse>builder()
                .status(HttpStatus.OK.value())
                .success(true)
                .message("Application retrieved")
                .data(application)
                .path(request.getRequestURI())
                .build();

        return ResponseEntity.ok(response);
    }

    /**
     * Review application (Approve or Reject)
     * POST /admin/applications/{id}/review
     */
    @PostMapping("/applications/{id}/review")
    public ResponseEntity<ApiResponse<Void>> reviewApplication(
            @PathVariable Long id,
            @Valid @RequestBody ReviewApplicationRequest request,
            HttpServletRequest httpRequest) {

        logger.info("📥 POST /admin/applications/{}/review - Action: {}", id, request.getAction());

        MessageResponse response = applicationService.reviewApplication(id, request);
        ApiResponse<Void> apiResponse = ApiResponse.<Void>builder()
                .status(response.getStatus())
                .success(response.isSuccess())
                .message(response.getMessage())
                .path(httpRequest.getRequestURI())
                .build();

        return ResponseEntity.status(response.getStatus()).body(apiResponse);
    }

    /**
     * Get all trial teachers
     * GET /admin/trial-teachers?page=0&size=10
     */
    @GetMapping("/trial-teachers")
    public ResponseEntity<PagedResponse<TrialStatusResponse>> getTrialTeachers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            HttpServletRequest request) {

        logger.info("📥 GET /admin/trial-teachers - Fetching trial teachers");

        Page<TrialStatusResponse> trialTeachers = applicationService.getTrialTeachers(page, size);

        PagedResponse<TrialStatusResponse> response =
                PagedResponse.of(
                        trialTeachers.getContent(),
                        trialTeachers.getNumber(),
                        trialTeachers.getSize(),
                        trialTeachers.getTotalElements(),
                        trialTeachers.getTotalPages()
                );
        response.setMessage("Trial teachers retrieved successfully");
        response.setPath(request.getRequestURI());

        return ResponseEntity.ok(response);
    }

    /**
     * Upgrade trial teacher to full teacher
     * POST /admin/trial-teachers/{userId}/upgrade
     */
    @PostMapping("/trial-teachers/{userId}/upgrade")
    public ResponseEntity<ApiResponse<Void>> upgradeTrialToFull(
            @PathVariable Long userId,
            @RequestBody(required = false) UpgradeTrialRequest request,
            HttpServletRequest httpRequest) {

        logger.info("📥 POST /admin/trial-teachers/{}/upgrade - Upgrading to full teacher", userId);

        if (request == null) {
            request = new UpgradeTrialRequest();
        }

        MessageResponse response = applicationService.upgradeTrialToFull(userId, request);
        ApiResponse<Void> apiResponse = ApiResponse.<Void>builder()
                .status(response.getStatus())
                .success(response.isSuccess())
                .message(response.getMessage())
                .path(httpRequest.getRequestURI())
                .build();

        return ResponseEntity.status(response.getStatus()).body(apiResponse);
    }
}
