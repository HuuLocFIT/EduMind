package com.edumind.auth.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class TwoFactorRequiredResponse {
    private boolean requires2FA = true;
    private String email;
    private String message;

    public TwoFactorRequiredResponse(String email, String message) {
        this.requires2FA = true;
        this.email = email;
        this.message = message;
    }
}