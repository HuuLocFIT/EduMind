package com.edumind.auth.controller;

import com.edumind.auth.dto.UserResponse;
import com.edumind.auth.service.UserService;
import com.edumind.common.response.ApiResponse;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/users")
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:4200"})
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
}
