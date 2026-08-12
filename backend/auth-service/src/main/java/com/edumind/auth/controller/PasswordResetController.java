package com.edumind.auth.controller;

import com.edumind.auth.dto.request.PasswordResetConfirmRequest;
import com.edumind.auth.dto.request.PasswordResetRequest;
import com.edumind.auth.dto.response.TokenValidationResponse;
import com.edumind.auth.entity.User;
import com.edumind.auth.service.PasswordResetService;
import com.edumind.common.response.ApiResponse;
import com.edumind.common.response.ErrorResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/auth/password")
public class PasswordResetController {
    private static final Logger logger = LoggerFactory.getLogger(PasswordResetController.class);

    @Autowired
    private PasswordResetService passwordResetService;

    /**
     * Request password reset - send email with token
     * POST /auth/password/forgot
     */
    @PostMapping("/forgot")
    public ResponseEntity<ApiResponse<String>> forgotPassword(
            @Valid @RequestBody PasswordResetRequest request,
            HttpServletRequest httpRequest) {
        logger.info("📥 POST /auth/password/forgot - Email: {}", request.getEmail());

        passwordResetService.requestPasswordReset(request.getEmail(), httpRequest);

        return ResponseEntity.ok(
                ApiResponse.success(
                        "If your email exists in our system, you will receive a password reset link.",
                        null
                )
        );
    }

    /**
     * Validate reset token
     * GET /auth/password/validate-token?token={token}
     */
    @GetMapping("/validate-token")
    public ResponseEntity<?> validateToken(
            @RequestParam String token) {
        logger.info("📥 GET /auth/password/validate-token");

        try {
            User user = passwordResetService.validateResetToken(token);
            TokenValidationResponse response = TokenValidationResponse.valid(user.getEmail());

            return ResponseEntity.ok(
                    ApiResponse.success("Token is valid", response)
            );
        } catch (Exception e) {
            logger.error("❌ Token validation failed: {}", e.getMessage());

            // ERROR: Use ErrorResponse
            return ResponseEntity.badRequest().body(
                    ErrorResponse.badRequest(e.getMessage())
            );
        }
    }

    /**
     * Reset password with token
     * POST /auth/password/reset
     */
    @PostMapping("/reset")
    public ResponseEntity<ApiResponse<String>> resetPassword(
            @Valid @RequestBody PasswordResetConfirmRequest request) {
        logger.info("📥 POST /auth/password/reset");

        passwordResetService.resetPassword(
                request.getToken(),
                request.getNewPassword(),
                request.getConfirmPassword()
        );

        return ResponseEntity.ok(
                ApiResponse.success(
                        "Password reset successfully! You can now log in with your new password.",
                        null
                )
        );
    }
}