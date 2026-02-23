package com.edumind.lms.shared.exception;

import com.edumind.common.response.ErrorResponse;
import com.edumind.lms.modules.course.exception.CourseAlreadyInWishlistException;
import com.edumind.lms.modules.course.exception.DuplicateReviewException;
import com.edumind.lms.modules.course.exception.InvalidRatingException;
import com.edumind.lms.modules.course.exception.NotEnrolledException;
import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import com.edumind.lms.modules.ai.exception.AiResponseParseException;
import com.edumind.lms.modules.payment.exception.PaymentFailedException;
import com.edumind.lms.modules.payment.gateway.exception.PaymentGatewayException;
import org.springframework.core.task.TaskRejectedException;
@Slf4j
@RestControllerAdvice(basePackages = "com.edumind.lms")
public class LmsGlobalExceptionHandler {

    private String generateRequestId() {
        return UUID.randomUUID().toString().substring(0, 8);
    }

    private ErrorResponse buildResponse(HttpStatus status, String error, String message,
                                        HttpServletRequest request) {
        return ErrorResponse.builder()
                .status(status.value())
                .success(false)
                .error(error)
                .message(message)
                .requestId(generateRequestId())
                .path(request.getRequestURI())
                .build();
    }

    @ExceptionHandler({ResourceNotFoundException.class, com.edumind.common.exception.ResourceNotFoundException.class})
    public ResponseEntity<ErrorResponse> handleResourceNotFound(RuntimeException ex,
                                                                HttpServletRequest request) {
        log.error("Resource not found: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(buildResponse(HttpStatus.NOT_FOUND, "Not Found", ex.getMessage(), request));
    }

    @ExceptionHandler({BadRequestException.class, com.edumind.common.exception.BadRequestException.class})
    public ResponseEntity<ErrorResponse> handleBadRequest(RuntimeException ex,
                                                          HttpServletRequest request) {
        log.warn("Bad request: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(buildResponse(HttpStatus.BAD_REQUEST, "Bad Request", ex.getMessage(), request));
    }

    @ExceptionHandler(ConflictException.class)
    public ResponseEntity<ErrorResponse> handleConflict(ConflictException ex,
                                                        HttpServletRequest request) {
        log.warn("Conflict: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(buildResponse(HttpStatus.CONFLICT, "Conflict", ex.getMessage(), request));
    }

    @ExceptionHandler(UnauthorizedException.class)
    public ResponseEntity<ErrorResponse> handleUnauthorized(UnauthorizedException ex,
                                                            HttpServletRequest request) {
        log.warn("Unauthorized: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(buildResponse(HttpStatus.FORBIDDEN, "Forbidden", ex.getMessage(), request));
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ErrorResponse> handleAccessDenied(AccessDeniedException ex,
                                                            HttpServletRequest request) {
        log.warn("Access denied: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(buildResponse(HttpStatus.FORBIDDEN, "Forbidden",
                        "You do not have permission to perform this action.", request));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidation(MethodArgumentNotValidException ex,
                                                          HttpServletRequest request) {
        Map<String, String> fieldErrors = new HashMap<>();
        for (FieldError error : ex.getBindingResult().getFieldErrors()) {
            fieldErrors.put(error.getField(), error.getDefaultMessage());
        }

        ErrorResponse response = ErrorResponse.builder()
                .status(HttpStatus.BAD_REQUEST.value())
                .success(false)
                .error("Validation Error")
                .message("Request is invalid, please check the data.")
                .fieldErrors(fieldErrors)
                .requestId(generateRequestId())
                .path(request.getRequestURI())
                .build();

        log.warn("Validation failed: {}", fieldErrors);
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
    }

    @ExceptionHandler(org.springframework.web.bind.MissingServletRequestParameterException.class)
    public ResponseEntity<ErrorResponse> handleMissingParams(org.springframework.web.bind.MissingServletRequestParameterException ex,
                                                             HttpServletRequest request) {
        log.warn("Missing request parameter: {}", ex.getParameterName());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(buildResponse(HttpStatus.BAD_REQUEST, "Missing Parameter", ex.getMessage(), request));
    }

    @ExceptionHandler({InvalidRatingException.class})
    public ResponseEntity<ErrorResponse> handleInvalidRating(InvalidRatingException ex,
                                                             HttpServletRequest request) {
        log.warn("Invalid rating: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(buildResponse(HttpStatus.BAD_REQUEST, "Bad Request", ex.getMessage(), request));
    }

    @ExceptionHandler({DuplicateReviewException.class, CourseAlreadyInWishlistException.class})
    public ResponseEntity<ErrorResponse> handleConflictExceptions(RuntimeException ex,
                                                                  HttpServletRequest request) {
        log.warn("Conflict detected: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(buildResponse(HttpStatus.CONFLICT, "Conflict", ex.getMessage(), request));
    }

    @ExceptionHandler(NotEnrolledException.class)
    public ResponseEntity<ErrorResponse> handleNotEnrolled(NotEnrolledException ex,
                                                           HttpServletRequest request) {
        log.warn("Access denied (not enrolled): {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(buildResponse(HttpStatus.FORBIDDEN, "Forbidden", ex.getMessage(), request));
    }

    @ExceptionHandler(PaymentFailedException.class)
    public ResponseEntity<ErrorResponse> handlePaymentFailed(PaymentFailedException ex,
                                                             HttpServletRequest request) {
        log.warn("Payment failed: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(buildResponse(HttpStatus.BAD_REQUEST, "Payment Failed", ex.getMessage(), request));
    }

    @ExceptionHandler(PaymentGatewayException.class)
    public ResponseEntity<ErrorResponse> handlePaymentGateway(PaymentGatewayException ex,
                                                              HttpServletRequest request) {
        log.error("Payment gateway error: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
                .body(buildResponse(HttpStatus.BAD_GATEWAY, "Payment Gateway Error", ex.getMessage(), request));
    }

    /**
     * Handles {@link AiResponseParseException} thrown synchronously from controllers.
     *
     * <p><b>NOTE:</b> This handler is NOT reachable from {@code @Async} workers. Exceptions thrown
     * inside {@code @Async} methods are routed to
     * {@link com.edumind.lms.config.AsyncConfig#getAsyncUncaughtExceptionHandler()}, which logs
     * them with method and parameter context. Phase 2/3 async AI failures are handled there,
     * not here. This handler is defensive only — for any synchronous call path to JsonExtractor.
     */
    @ExceptionHandler(AiResponseParseException.class)
    public ResponseEntity<ErrorResponse> handleAiResponseParse(AiResponseParseException ex,
                                                               HttpServletRequest request) {
        log.warn("AI response parse error: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY)
                .body(buildResponse(HttpStatus.UNPROCESSABLE_ENTITY, "AI Response Error", ex.getMessage(), request));
    }

    @ExceptionHandler(TaskRejectedException.class)
    public ResponseEntity<ErrorResponse> handleTaskRejected(TaskRejectedException ex,
                                                            HttpServletRequest request) {
        log.warn("Task queue full: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                .body(buildResponse(HttpStatus.TOO_MANY_REQUESTS, "Queue Full",
                        "Transcription queue is full. Please try again later.", request));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGeneric(Exception ex, HttpServletRequest request) {
        log.error("Unexpected error", ex);
        ErrorResponse response = ErrorResponse.builder()
                .status(HttpStatus.INTERNAL_SERVER_ERROR.value())
                .success(false)
                .error("Internal Server Error")
                .message("An unexpected error occurred, please try again later.")
                .requestId(generateRequestId())
                .path(request.getRequestURI())
                .build();
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
    }
}

