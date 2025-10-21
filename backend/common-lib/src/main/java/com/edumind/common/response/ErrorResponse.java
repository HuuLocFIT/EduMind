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

    private String message;

    private List<String> details;

    private Map<String, String> fieldErrors;

    @Builder.Default
    private LocalDateTime timestamp = LocalDateTime.now();

    private String requestId;

    private String path;

    private String trace;

    // Static factory methods
    public static ErrorResponse badRequest(String message) {
        return ErrorResponse.builder()
                .status(400)
                .success(false)
                .error("Bad Request")
                .message(message)
                .timestamp(LocalDateTime.now())
                .build();
    }

    public static ErrorResponse unauthorized(String message) {
        return ErrorResponse.builder()
                .status(401)
                .success(false)
                .error("Unauthorized")
                .message(message)
                .timestamp(LocalDateTime.now())
                .build();
    }

    public static ErrorResponse forbidden(String message) {
        return ErrorResponse.builder()
                .status(403)
                .success(false)
                .error("Forbidden")
                .message(message)
                .timestamp(LocalDateTime.now())
                .build();
    }

    public static ErrorResponse notFound(String message) {
        return ErrorResponse.builder()
                .status(404)
                .success(false)
                .error("Not Found")
                .message(message)
                .timestamp(LocalDateTime.now())
                .build();
    }

    public static ErrorResponse internalServerError(String message) {
        return ErrorResponse.builder()
                .status(500)
                .success(false)
                .error("Internal Server Error")
                .message(message)
                .timestamp(LocalDateTime.now())
                .build();
    }
}
