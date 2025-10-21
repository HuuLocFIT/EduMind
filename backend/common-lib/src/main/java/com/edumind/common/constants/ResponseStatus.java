package com.edumind.common.constants;

public final class ResponseStatus {
    private ResponseStatus() {
        // Prevent instantiation
    }

    // Success Messages
    public static final String SUCCESS = "Operation completed successfully";
    public static final String CREATED = "Resource created successfully";
    public static final String UPDATED = "Resource updated successfully";
    public static final String DELETED = "Resource deleted successfully";

    // Auth Messages
    public static final String LOGIN_SUCCESS = "Login successful";
    public static final String LOGOUT_SUCCESS = "Logout successful";
    public static final String REGISTER_SUCCESS = "Registration successful";
    public static final String TOKEN_REFRESHED = "Token refreshed successfully";

    // Error Messages
    public static final String INVALID_REQUEST = "Invalid request";
    public static final String UNAUTHORIZED = "Authentication required";
    public static final String FORBIDDEN = "Access denied";
    public static final String NOT_FOUND = "Resource not found";
    public static final String INTERNAL_ERROR = "An unexpected error occurred";
}
