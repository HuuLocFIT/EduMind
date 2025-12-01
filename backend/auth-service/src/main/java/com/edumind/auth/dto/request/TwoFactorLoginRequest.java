package com.edumind.auth.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request to complete login with 2FA code
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class TwoFactorLoginRequest {
    @NotBlank(message = "Username or email is required")
    private String usernameOrEmail;

    @NotBlank(message = "Code is required")
    private String code; // Can be TOTP code or backup code

    private Boolean useBackupCode = false;
}