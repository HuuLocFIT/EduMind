package com.edumind.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request to disable 2FA
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class TwoFactorDisableRequest {
    @NotBlank(message = "Password is required")
    private String password;

    @Pattern(regexp = "^[0-9]{6}$", message = "TOTP code must be 6 digits")
    private String code; // Optional: can also disable with backup code
}
