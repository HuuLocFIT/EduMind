package com.edumind.common.constants;

public final class ErrorCode {
    private ErrorCode() {
        // Prevent instantiation
    }

    // General Errors (1xxx)
    public static final String GENERAL_ERROR = "ERR_1000";
    public static final String VALIDATION_ERROR = "ERR_1001";
    public static final String INVALID_INPUT = "ERR_1002";

    // Authentication Errors (2xxx)
    public static final String AUTH_FAILED = "ERR_2000";
    public static final String INVALID_CREDENTIALS = "ERR_2001";
    public static final String TOKEN_EXPIRED = "ERR_2002";
    public static final String TOKEN_INVALID = "ERR_2003";
    public static final String TOKEN_REFRESH_FAILED = "ERR_2004";
    public static final String TOKEN_MISSING = "ERR_2005";

    // Authorization Errors (3xxx)
    public static final String ACCESS_DENIED = "ERR_3000";
    public static final String INSUFFICIENT_PERMISSIONS = "ERR_3001";

    // Resource Errors (4xxx)
    public static final String RESOURCE_NOT_FOUND = "ERR_4000";
    public static final String RESOURCE_ALREADY_EXISTS = "ERR_4001";

    // User Errors (5xxx)
    public static final String USER_NOT_FOUND = "ERR_5000";
    public static final String USERNAME_TAKEN = "ERR_5001";
    public static final String EMAIL_TAKEN = "ERR_5002";
    public static final String USER_INACTIVE = "ERR_5003";

    // Server Errors (9xxx)
    public static final String INTERNAL_SERVER_ERROR = "ERR_9000";
    public static final String DATABASE_ERROR = "ERR_9002";
}
