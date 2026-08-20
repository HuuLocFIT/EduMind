package com.edumind.common.exception;

import com.edumind.common.constants.ErrorCode;
import com.edumind.common.response.ErrorResponse;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.task.TaskRejectedException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestControllerAdvice
public class GlobalExceptionHandler {
    private static final Logger logger = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @Value("${app.debug:false}")
    private boolean debugMode;

    private String generateRequestId() {
        return UUID.randomUUID().toString().substring(0, 8);
    }

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleResourceNotFoundException(
            ResourceNotFoundException ex, HttpServletRequest request) {

        String requestId = generateRequestId();
        logger.error("❌ [{}] Resource not found: {}", requestId, ex.getMessage());

        ErrorResponse errorResponse = ErrorResponse.builder()
                .status(HttpStatus.NOT_FOUND.value())
                .success(false)
                .error("Not Found")
                .errorCode(ErrorCode.RESOURCE_NOT_FOUND)
                .message(ex.getMessage())
                .timestamp(LocalDateTime.now())
                .requestId(requestId)
                .path(request.getRequestURI())
                .build();

        return new ResponseEntity<>(errorResponse, HttpStatus.NOT_FOUND);
    }

    @ExceptionHandler(BadRequestException.class)
    public ResponseEntity<ErrorResponse> handleBadRequestException(
            BadRequestException ex, HttpServletRequest request) {

        String requestId = generateRequestId();
        logger.error("❌ [{}] Bad request: {}", requestId, ex.getMessage());

        ErrorResponse errorResponse = ErrorResponse.builder()
                .status(HttpStatus.BAD_REQUEST.value())
                .success(false)
                .error("Bad Request")
                .errorCode(ErrorCode.INVALID_INPUT)
                .message(ex.getMessage())
                .timestamp(LocalDateTime.now())
                .requestId(requestId)
                .path(request.getRequestURI())
                .build();

        return new ResponseEntity<>(errorResponse, HttpStatus.BAD_REQUEST);
    }

    @ExceptionHandler(FileUploadException.class)
    public ResponseEntity<ErrorResponse> handleFileUploadException(
            FileUploadException ex, HttpServletRequest request) {

        String requestId = generateRequestId();
        logger.error("❌ [{}] File upload error: {}", requestId, ex.getMessage());

        ErrorResponse errorResponse = ErrorResponse.builder()
                .status(HttpStatus.BAD_REQUEST.value())
                .success(false)
                .error("Bad Request")
                .errorCode(ErrorCode.INVALID_INPUT)
                .message(ex.getMessage())
                .timestamp(LocalDateTime.now())
                .requestId(requestId)
                .path(request.getRequestURI())
                .build();

        return new ResponseEntity<>(errorResponse, HttpStatus.BAD_REQUEST);
    }

    @ExceptionHandler(EmailSendException.class)
    public ResponseEntity<ErrorResponse> handleEmailSendException(
            EmailSendException ex, HttpServletRequest request) {

        String requestId = generateRequestId();
        logger.error("❌ [{}] Email send error: {}", requestId, ex.getMessage(), ex);

        ErrorResponse errorResponse = ErrorResponse.builder()
                .status(HttpStatus.INTERNAL_SERVER_ERROR.value())
                .success(false)
                .error("Internal Server Error")
                .errorCode(ErrorCode.INTERNAL_SERVER_ERROR)
                .message(ex.getMessage())
                .timestamp(LocalDateTime.now())
                .requestId(requestId)
                .path(request.getRequestURI())
                .build();

        return new ResponseEntity<>(errorResponse, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    @ExceptionHandler(TooManyRequestsException.class)
    public ResponseEntity<ErrorResponse> handleTooManyRequests(TooManyRequestsException ex) {
        logger.error("Rate limit exceeded: {}", ex.getMessage());

        ErrorResponse error = ErrorResponse.builder()
                .status(HttpStatus.TOO_MANY_REQUESTS.value())
                .success(false)
                .error("Too Many Requests")
                .message("Rate limit exceeded")
                .timestamp(LocalDateTime.now())
                .build();

        return ResponseEntity
                .status(HttpStatus.TOO_MANY_REQUESTS)
                .body(error);
    }

    @ExceptionHandler(TokenRefreshException.class)
    public ResponseEntity<ErrorResponse> handleTokenRefreshException(
            TokenRefreshException ex, HttpServletRequest request) {

        String requestId = generateRequestId();
        logger.error("❌ [{}] Token refresh failed: {}", requestId, ex.getMessage());

        ErrorResponse errorResponse = ErrorResponse.builder()
                .status(HttpStatus.FORBIDDEN.value())
                .success(false)
                .error("Forbidden")
                .errorCode(ErrorCode.TOKEN_REFRESH_FAILED)
                .message(ex.getMessage())
                .timestamp(LocalDateTime.now())
                .requestId(requestId)
                .path(request.getRequestURI())
                .build();

        return new ResponseEntity<>(errorResponse, HttpStatus.FORBIDDEN);
    }

    @ExceptionHandler(BadCredentialsException.class)
    public ResponseEntity<ErrorResponse> handleBadCredentialsException(
            BadCredentialsException ex, HttpServletRequest request) {

        String requestId = generateRequestId();
        logger.error("❌ [{}] Authentication failed: {}", requestId, ex.getMessage());

        ErrorResponse errorResponse = ErrorResponse.builder()
                .status(HttpStatus.UNAUTHORIZED.value())
                .success(false)
                .error("Unauthorized")
                .errorCode(ErrorCode.INVALID_CREDENTIALS)
                .message("Invalid username/email or password")
                .timestamp(LocalDateTime.now())
                .requestId(requestId)
                .path(request.getRequestURI())
                .build();

        return new ResponseEntity<>(errorResponse, HttpStatus.UNAUTHORIZED);
    }

    @ExceptionHandler(UsernameNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleUsernameNotFound(
            UsernameNotFoundException ex, HttpServletRequest request) {

        String requestId = generateRequestId();
        logger.error("❌ [{}] Username not found: {}", requestId, ex.getMessage());

        ErrorResponse errorResponse = ErrorResponse.builder()
                .status(HttpStatus.NOT_FOUND.value())
                .success(false)
                .error("Not Found")
                .errorCode(ErrorCode.RESOURCE_NOT_FOUND)
                .message(ex.getMessage())
                .timestamp(LocalDateTime.now())
                .requestId(requestId)
                .path(request.getRequestURI())
                .build();

        return new ResponseEntity<>(errorResponse, HttpStatus.NOT_FOUND);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ErrorResponse> handleIllegalArgument(
            IllegalArgumentException ex, HttpServletRequest request) {

        String requestId = generateRequestId();
        logger.error("❌ [{}] Illegal argument: {}", requestId, ex.getMessage());

        ErrorResponse errorResponse = ErrorResponse.builder()
                .status(HttpStatus.BAD_REQUEST.value())
                .success(false)
                .error("Bad Request")
                .errorCode(ErrorCode.INVALID_INPUT)
                .message(ex.getMessage())
                .timestamp(LocalDateTime.now())
                .requestId(requestId)
                .path(request.getRequestURI())
                .build();

        return new ResponseEntity<>(errorResponse, HttpStatus.BAD_REQUEST);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidationException(
            MethodArgumentNotValidException ex, HttpServletRequest request) {

        String requestId = generateRequestId();
        logger.error("❌ [{}] Validation failed: {}", requestId, ex.getMessage());

        List<String> details = new ArrayList<>();
        Map<String, String> fieldErrors = new HashMap<>();

        for (FieldError error : ex.getBindingResult().getFieldErrors()) {
            String field = error.getField();
            String message = error.getDefaultMessage();
            fieldErrors.put(field, message);
            details.add(field + ": " + message);
        }

        ErrorResponse errorResponse = ErrorResponse.builder()
                .status(HttpStatus.BAD_REQUEST.value())
                .success(false)
                .error("Bad Request")
                .errorCode(ErrorCode.VALIDATION_ERROR)
                .message("Validation failed for one or more fields")
                .details(details)
                .fieldErrors(fieldErrors)
                .timestamp(LocalDateTime.now())
                .requestId(requestId)
                .path(request.getRequestURI())
                .build();

        return new ResponseEntity<>(errorResponse, HttpStatus.BAD_REQUEST);
    }

    @ExceptionHandler(TaskRejectedException.class)
    public ResponseEntity<ErrorResponse> handleQueueFull(TaskRejectedException ex, HttpServletRequest request) {
        String requestId = generateRequestId();
        logger.warn("⚠️ [{}] Task rejected (queue full): {}", requestId, ex.getMessage());

        ErrorResponse error = ErrorResponse.builder()
                .status(HttpStatus.TOO_MANY_REQUESTS.value())
                .success(false)
                .error("Queue Full")
                .message("AI processing queue is full. Please try again later.")
                .timestamp(LocalDateTime.now())
                .requestId(requestId)
                .path(request.getRequestURI())
                .build();

        return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).body(error);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGlobalException(
            Exception ex, HttpServletRequest request) {

        String requestId = generateRequestId();
        logger.error("❌ [{}] Unexpected error: {}", requestId, ex.getMessage(), ex);

        ErrorResponse errorResponse = ErrorResponse.builder()
                .status(HttpStatus.INTERNAL_SERVER_ERROR.value())
                .success(false)
                .error("Internal Server Error")
                .errorCode(ErrorCode.INTERNAL_SERVER_ERROR)
                .message("An unexpected error occurred. Please try again later.")
                .timestamp(LocalDateTime.now())
                .requestId(requestId)
                .path(request.getRequestURI())
                .build();

        return new ResponseEntity<>(errorResponse, HttpStatus.INTERNAL_SERVER_ERROR);
    }
}
