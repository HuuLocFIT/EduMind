package com.edumind.auth.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Response containing 2FA status
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class TwoFactorStatusResponse {
    private boolean enabled;
    private int backupCodesRemaining;
    private String message;

    public static TwoFactorStatusResponse enabled(int backupCodesRemaining) {
        return new TwoFactorStatusResponse(
                true,
                backupCodesRemaining,
                "Two-factor authentication is enabled"
        );
    }

    public static TwoFactorStatusResponse disabled() {
        return new TwoFactorStatusResponse(
                false,
                0,
                "Two-factor authentication is disabled"
        );
    }
}