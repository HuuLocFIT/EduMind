package com.edumind.common.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ErrorResponse {
    private int status;

    @Builder.Default
    private boolean success = false;

    private String error;

    private String errorCode;

    private String message;

    private List<String> details;

    private Map<String, String> fieldErrors;

    @Builder.Default
    private LocalDateTime timestamp = LocalDateTime.now();

    private String requestId;

    private String path;

    private String trace;

    public static ErrorResponse badRequest(String message) {
        return ErrorResponse.builder()
                .status(400)
                .error("Bad Request")
                .message(message)
                .build();
    }

    public static ErrorResponse badRequest(String message, String errorCode) {
        return ErrorResponse.builder()
                .status(400)
                .error("Bad Request")
                .errorCode(errorCode)
                .message(message)
                .build();
    }

    public static ErrorResponse unauthorized(String message) {
        return ErrorResponse.builder()
                .status(401)
                .error("Unauthorized")
                .message(message)
                .build();
    }

    public static ErrorResponse unauthorized(String message, String errorCode) {
        return ErrorResponse.builder()
                .status(401)
                .error("Unauthorized")
                .errorCode(errorCode)
                .message(message)
                .build();
    }

    public static ErrorResponse forbidden(String message) {
        return ErrorResponse.builder()
                .status(403)
                .error("Forbidden")
                .message(message)
                .build();
    }

    public static ErrorResponse forbidden(String message, String errorCode) {
        return ErrorResponse.builder()
                .status(403)
                .error("Forbidden")
                .errorCode(errorCode)
                .message(message)
                .build();
    }

    public static ErrorResponse notFound(String message) {
        return ErrorResponse.builder()
                .status(404)
                .error("Not Found")
                .message(message)
                .build();
    }

    public static ErrorResponse notFound(String message, String errorCode) {
        return ErrorResponse.builder()
                .status(404)
                .error("Not Found")
                .errorCode(errorCode)
                .message(message)
                .build();
    }

    public static ErrorResponse conflict(String message) {
        return ErrorResponse.builder()
                .status(409)
                .error("Conflict")
                .message(message)
                .build();
    }

    public static ErrorResponse conflict(String message, String errorCode) {
        return ErrorResponse.builder()
                .status(409)
                .error("Conflict")
                .errorCode(errorCode)
                .message(message)
                .build();
    }

    public static ErrorResponse internalServerError(String message) {
        return ErrorResponse.builder()
                .status(500)
                .error("Internal Server Error")
                .message(message)
                .build();
    }

    public static ErrorResponse internalServerError(String message, String errorCode) {
        return ErrorResponse.builder()
                .status(500)
                .error("Internal Server Error")
                .errorCode(errorCode)
                .message(message)
                .build();
    }

    public ErrorResponse withPath(String path) {
        this.path = path;
        return this;
    }

    public ErrorResponse withRequestId(String requestId) {
        this.requestId = requestId;
        return this;
    }
}