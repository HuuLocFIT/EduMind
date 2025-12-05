package com.edumind.lms.config.security;

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
    private String errorCode;
    private String errorMessage;

    public static JwtValidationResult success() {
        return JwtValidationResult.builder()
                .valid(true)
                .build();
    }

    public static JwtValidationResult failure(String errorCode, String errorMessage) {
        return JwtValidationResult.builder()
                .valid(false)
                .errorCode(errorCode)
                .errorMessage(errorMessage)
                .build();
    }
}
