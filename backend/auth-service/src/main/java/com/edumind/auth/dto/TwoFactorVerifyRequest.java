package com.edumind.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request to verify and enable 2FA
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class TwoFactorVerifyRequest {
    @NotBlank(message = "TOTP code is required")
    @Pattern(regexp = "^[0-9]{6}$", message = "TOTP code must be 6 digits")
    private String code;

    private String secret; // Temporary secret from setup (not stored yet)
}