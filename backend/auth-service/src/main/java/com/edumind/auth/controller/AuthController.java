package com.edumind.auth.controller;

import com.edumind.auth.dto.request.LoginRequest;
import com.edumind.auth.dto.request.RefreshTokenRequest;
import com.edumind.auth.dto.request.SignupRequest;
import com.edumind.auth.dto.request.TwoFactorLoginRequest;
import com.edumind.auth.dto.response.JwtResponse;
import com.edumind.auth.service.AuthService;
import com.edumind.common.response.ApiResponse;
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
public class AuthController {
    private static final Logger logger = LoggerFactory.getLogger(AuthController.class);

    @Autowired
    private AuthService authService;

    /**
     * Register a new user
     * POST /auth/signup
     */
    @PostMapping("/signup")
    public ResponseEntity<ApiResponse<Void>> registerUser(
            @Valid @RequestBody SignupRequest signUpRequest,
            HttpServletRequest request) {

        logger.info("📥 POST /auth/signup - Register new user: {}", signUpRequest.getUsername());

        authService.registerUser(signUpRequest);

        ApiResponse<Void> response = ApiResponse.<Void>builder()
                .status(HttpStatus.CREATED.value())
                .success(true)
                .message(ResponseStatus.REGISTER_SUCCESS)
                .path(request.getRequestURI())
                .build();

        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * Response can be:
     * - ApiResponse<JwtResponse> (normal login)
     * - ApiResponse<TwoFactorRequiredResponse> (2FA enabled)
     */
    @PostMapping("/login")
    public ResponseEntity<?> authenticateUser(
            @Valid @RequestBody LoginRequest loginRequest,
            HttpServletRequest request) {
        logger.info("📥 POST /auth/login - Authenticate user: {}", loginRequest.getUsernameOrEmail());
        Object authResponse = authService.authenticateUser(loginRequest);
        
        // Wrap response in ApiResponse
        ApiResponse<?> response;
        if (authResponse instanceof JwtResponse) {
            response = ApiResponse.<JwtResponse>builder()
                    .status(HttpStatus.OK.value())
                    .success(true)
                    .message(ResponseStatus.LOGIN_SUCCESS)
                    .data((JwtResponse) authResponse)
                    .path(request.getRequestURI())
                    .build();
        } else {
            // TwoFactorRequiredResponse
            response = ApiResponse.builder()
                    .status(HttpStatus.OK.value())
                    .success(true)
                    .data(authResponse)
                    .path(request.getRequestURI())
                    .build();
        }
        
        return ResponseEntity.ok(response);
    }

    /**
     * POST /auth/login/2fa
     */
    @PostMapping("/login/2fa")
    public ResponseEntity<ApiResponse<JwtResponse>> verify2FALogin(
            @Valid @RequestBody TwoFactorLoginRequest request,
            HttpServletRequest httpRequest) {
        logger.info("📥 POST /auth/login/2fa - Verify 2FA for: {}", request.getUsernameOrEmail());
        JwtResponse jwtResponse = authService.verify2FAAndLogin(request);
        
        ApiResponse<JwtResponse> response = ApiResponse.<JwtResponse>builder()
                .status(HttpStatus.OK.value())
                .success(true)
                .message(ResponseStatus.LOGIN_SUCCESS)
                .data(jwtResponse)
                .path(httpRequest.getRequestURI())
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
    public ResponseEntity<ApiResponse<Void>> logout(HttpServletRequest request) {
        logger.info("📥 POST /auth/logout - User logout");

        authService.logout();

        ApiResponse<Void> response = ApiResponse.<Void>builder()
                .status(HttpStatus.OK.value())
                .success(true)
                .message(ResponseStatus.LOGOUT_SUCCESS)
                .path(request.getRequestURI())
                .build();

        return ResponseEntity.ok(response);
    }
}
