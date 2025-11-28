package com.edumind.auth.enums;

public enum AuthProvider {
    LOCAL,
    GOOGLE,
    FACEBOOK;

    /**
     * Parse provider from string (case-insensitive)
     */
    public static AuthProvider fromString(String provider) {
        if (provider == null || provider.isEmpty()) {
            return LOCAL;
        }
        try {
            return AuthProvider.valueOf(provider.toUpperCase());
        } catch (IllegalArgumentException e) {
            return LOCAL;
        }
    }

    /**
     * Check if provider is OAuth2
     */
    public boolean isOAuth2() {
        return this != LOCAL;
    }
}
