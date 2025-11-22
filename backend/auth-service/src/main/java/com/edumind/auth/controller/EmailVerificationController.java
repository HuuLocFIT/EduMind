package com.edumind.auth.controller;

import com.edumind.auth.dto.EmailVerificationRequest;
import com.edumind.auth.service.EmailVerificationService;
import com.edumind.common.response.ApiResponse;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/auth")
public class EmailVerificationController {
    private static final Logger logger = LoggerFactory.getLogger(EmailVerificationController.class);

    @Autowired
    private EmailVerificationService emailVerificationService;

    /**
     * Verify email with token
     * GET /auth/verify-email?token={token}
     */
    @GetMapping("/verify-email")
    public ResponseEntity<ApiResponse<String>> verifyEmail(@RequestParam String token) {
        logger.info("📥 GET /auth/verify-email - Token: {}", token);

        emailVerificationService.verifyEmail(token);

        return ResponseEntity.ok(
                ApiResponse.success("Email verified successfully! You can now log in.", null)
        );
    }

    /**
     * Resend verification email
     * POST /auth/resend-verification
     */
    @PostMapping("/resend-verification")
    public ResponseEntity<ApiResponse<String>> resendVerification(
            @Valid @RequestBody EmailVerificationRequest request) {
        logger.info("📥 POST /auth/resend-verification - Email: {}", request.getEmail());

        emailVerificationService.resendVerificationEmail(request.getEmail());

        return ResponseEntity.ok(
                ApiResponse.success(
                        "Verification email sent! Please check your inbox.",
                        null
                )
        );
    }
}