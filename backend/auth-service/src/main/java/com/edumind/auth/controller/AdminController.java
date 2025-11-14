package com.edumind.auth.controller;

import com.edumind.auth.dto.CreateUserRequest;
import com.edumind.auth.dto.UpdateUserRoleRequest;
import com.edumind.auth.dto.UserListResponse;
import com.edumind.auth.service.AdminService;
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
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:4200"})
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {
    private static final Logger logger = LoggerFactory.getLogger(AdminController.class);

    @Autowired
    private AdminService adminService;

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
}
