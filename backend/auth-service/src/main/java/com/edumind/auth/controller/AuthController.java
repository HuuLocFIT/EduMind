package com.edumind.auth.controller;

import com.edumind.auth.dto.*;
import com.edumind.auth.service.AuthService;
import com.edumind.common.response.ApiResponse;
import com.edumind.common.response.MessageResponse;
import com.edumind.common.constants.ResponseStatus;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/auth")
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:4200"})
public class AuthController {
    private static final Logger logger = LoggerFactory.getLogger(AuthController.class);

    @Autowired
    private AuthService authService;

    /**
     * Register a new user
     * POST /auth/signup
     */
    @PostMapping("/signup")
    public ResponseEntity<MessageResponse> registerUser(
            @Valid @RequestBody SignupRequest signUpRequest,
            HttpServletRequest request) {

        logger.info("📥 POST /auth/signup - Register new user: {}", signUpRequest.getUsername());

        authService.registerUser(signUpRequest);

        MessageResponse response = MessageResponse.builder()
                .status(HttpStatus.CREATED.value())
                .success(true)
                .message(ResponseStatus.REGISTER_SUCCESS)
                .build();

        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * Authenticate user and get JWT tokens
     * POST /auth/login
     */
    @PostMapping("/login")
    public ResponseEntity<ApiResponse<JwtResponse>> authenticateUser(
            @Valid @RequestBody LoginRequest loginRequest,
            HttpServletRequest request) {

        logger.info("📥 POST /auth/login - Authenticate user: {}", loginRequest.getUsernameOrEmail());

        JwtResponse jwtResponse = authService.authenticateUser(loginRequest);

        ApiResponse<JwtResponse> response = ApiResponse.<JwtResponse>builder()
                .status(HttpStatus.OK.value())
                .success(true)
                .message(ResponseStatus.LOGIN_SUCCESS)
                .data(jwtResponse)
                .path(request.getRequestURI())
                .build();

        return ResponseEntity.ok(response);
    }

    /**
     * Refresh access token using refresh token
     * POST /auth/refresh
     */
    @PostMapping("/refresh")
    public ResponseEntity<ApiResponse<JwtResponse>> refreshToken(
            @Valid @RequestBody RefreshTokenRequest refreshRequest,
            HttpServletRequest request) {

        logger.info("📥 POST /auth/refresh - Refresh access token");

        JwtResponse jwtResponse = authService.refreshToken(refreshRequest);

        ApiResponse<JwtResponse> response = ApiResponse.<JwtResponse>builder()
                .status(HttpStatus.OK.value())
                .success(true)
                .message(ResponseStatus.TOKEN_REFRESHED)
                .data(jwtResponse)
                .path(request.getRequestURI())
                .build();

        return ResponseEntity.ok(response);
    }

    /**
     * Logout user and revoke refresh token
     * POST /auth/logout
     */
    @PostMapping("/logout")
    public ResponseEntity<MessageResponse> logout(HttpServletRequest request) {
        logger.info("📥 POST /auth/logout - User logout");

        authService.logout();

        MessageResponse response = MessageResponse.builder()
                .status(HttpStatus.OK.value())
                .success(true)
                .message(ResponseStatus.LOGOUT_SUCCESS)
                .build();

        return ResponseEntity.ok(response);
    }
}
