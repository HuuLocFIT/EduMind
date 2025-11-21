package com.edumind.common.exception;

/**
 * Exception thrown when rate limit is exceeded
 * HTTP Status: 429 Too Many Requests
 *
 * Can be used across all services for rate limiting scenarios
 */
public class TooManyRequestsException extends RuntimeException {
    public TooManyRequestsException(String message) {
        super(message);
    }

    public TooManyRequestsException(String message, Throwable cause) {
        super(message, cause);
    }
}