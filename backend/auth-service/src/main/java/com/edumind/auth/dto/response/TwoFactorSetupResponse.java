package com.edumind.auth.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Response containing 2FA setup information
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class TwoFactorSetupResponse {
    private String secret; // TOTP secret (Base32 encoded)
    private String qrCodeUrl; // Data URL for QR code image
    private String manualEntryKey; // For manual entry in authenticator app
    private List<String> backupCodes; // Backup codes for account recovery
    private String message;

    public TwoFactorSetupResponse(String secret, String qrCodeUrl, String manualEntryKey, List<String> backupCodes) {
        this.secret = secret;
        this.qrCodeUrl = qrCodeUrl;
        this.manualEntryKey = manualEntryKey;
        this.backupCodes = backupCodes;
        this.message = "Scan the QR code with your authenticator app or enter the manual key";
    }
}