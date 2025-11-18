package com.edumind.auth.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Response for token validation check
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class TokenValidationResponse {
    private boolean valid;
    private String message;
    private String email; // For display purposes

    public static TokenValidationResponse valid(String email) {
        return new TokenValidationResponse(true, "Token is valid", email);
    }

    public static TokenValidationResponse invalid(String message) {
        return new TokenValidationResponse(false, message, null);
    }
}