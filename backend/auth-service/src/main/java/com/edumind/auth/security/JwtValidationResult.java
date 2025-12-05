package com.edumind.auth.security;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class JwtValidationResult {

    private boolean valid;
    private String errorType;
    private String errorMessage;

    public static JwtValidationResult success() {
        return JwtValidationResult.builder()
                .valid(true)
                .build();
    }

    public static JwtValidationResult failure(String errorType, String errorMessage) {
        return JwtValidationResult.builder()
                .valid(false)
                .errorType(errorType)
                .errorMessage(errorMessage)
                .build();
    }
}