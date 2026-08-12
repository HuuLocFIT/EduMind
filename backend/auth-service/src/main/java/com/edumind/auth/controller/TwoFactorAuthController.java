package com.edumind.auth.controller;

import com.edumind.auth.dto.request.TwoFactorDisableRequest;
import com.edumind.auth.dto.request.TwoFactorVerifyRequest;
import com.edumind.auth.dto.response.BackupCodesResponse;
import com.edumind.auth.dto.response.TwoFactorSetupResponse;
import com.edumind.auth.dto.response.TwoFactorStatusResponse;
import com.edumind.auth.service.TwoFactorAuthService;
import com.edumind.common.response.ApiResponse;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/auth/2fa")
public class TwoFactorAuthController {
    private static final Logger logger = LoggerFactory.getLogger(TwoFactorAuthController.class);

    @Autowired
    private TwoFactorAuthService twoFactorAuthService;

    /**
     * Setup 2FA - Generate QR code and backup codes
     * POST /auth/2fa/setup
     */
    @PostMapping("/setup")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<TwoFactorSetupResponse>> setup2FA() {
        logger.info("📥 POST /auth/2fa/setup");

        TwoFactorSetupResponse response = twoFactorAuthService.setup2FA();

        return ResponseEntity.ok(
                ApiResponse.success("2FA setup generated. Scan QR code with your authenticator app.", response)
        );
    }

    /**
     * Verify and enable 2FA
     * POST /auth/2fa/verify
     */
    @PostMapping("/verify")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<TwoFactorStatusResponse>> verify2FA(
            @Valid @RequestBody TwoFactorVerifyRequest request) {
        logger.info("📥 POST /auth/2fa/verify");

        TwoFactorStatusResponse response = twoFactorAuthService.verify2FA(request.getCode());

        return ResponseEntity.ok(
                ApiResponse.success("Two-factor authentication enabled successfully!", response)
        );
    }

    /**
     * Disable 2FA
     * POST /auth/2fa/disable
     */
    @PostMapping("/disable")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<TwoFactorStatusResponse>> disable2FA(
            @Valid @RequestBody TwoFactorDisableRequest request) {
        logger.info("📥 POST /auth/2fa/disable");

        TwoFactorStatusResponse response = twoFactorAuthService.disable2FA(
                request.getPassword(),
                request.getCode()
        );

        return ResponseEntity.ok(
                ApiResponse.success("Two-factor authentication disabled successfully.", response)
        );
    }

    /**
     * Get 2FA status
     * GET /auth/2fa/status
     */
    @GetMapping("/status")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<TwoFactorStatusResponse>> get2FAStatus() {
        logger.info("📥 GET /auth/2fa/status");

        TwoFactorStatusResponse response = twoFactorAuthService.get2FAStatus();

        return ResponseEntity.ok(
                ApiResponse.success("2FA status retrieved", response)
        );
    }

    /**
     * Regenerate backup codes
     * POST /auth/2fa/backup-codes
     */
    @PostMapping("/backup-codes")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<BackupCodesResponse>> regenerateBackupCodes(
            @RequestBody Map<String, String> request) {
        logger.info("📥 POST /auth/2fa/backup-codes");

        String password = request.get("password");
        BackupCodesResponse response = twoFactorAuthService.regenerateBackupCodes(password);

        return ResponseEntity.ok(
                ApiResponse.success("Backup codes regenerated successfully. Save them in a secure location.", response)
        );
    }
}