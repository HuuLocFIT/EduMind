package com.edumind.lms.config.security;

import com.edumind.common.constants.ErrorCode;
import com.edumind.common.response.ErrorResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.io.IOException;

@Slf4j
@Component
@RequiredArgsConstructor
public class JwtAuthenticationEntryPoint implements AuthenticationEntryPoint {
    private final ObjectMapper objectMapper;

    @Override
    public void commence(HttpServletRequest request,
                         HttpServletResponse response,
                         AuthenticationException authException) throws IOException {

        // Read error code and message from request attributes (set by JwtAuthenticationFilter)
        String errorCode = (String) request.getAttribute(JwtAuthenticationFilter.JWT_ERROR_CODE_ATTRIBUTE);
        String errorMessage = (String) request.getAttribute(JwtAuthenticationFilter.JWT_ERROR_MESSAGE_ATTRIBUTE);

        // If no error code from filter, check if token is missing
        if (!StringUtils.hasText(errorCode)) {
            String authHeader = request.getHeader("Authorization");
            if (!StringUtils.hasText(authHeader) || !authHeader.startsWith("Bearer ")) {
                errorCode = ErrorCode.TOKEN_MISSING;
                errorMessage = "Authentication token is required. Please provide a valid Bearer token.";
                log.warn("Unauthorized access - Missing token: {}", request.getRequestURI());
            } else {
                errorCode = ErrorCode.AUTH_FAILED;
                errorMessage = "Full authentication is required to access this resource";
                log.error("Unauthorized error: {}", authException.getMessage());
            }
        } else {
            log.warn("Unauthorized access - {}: {}", errorCode, request.getRequestURI());
        }

        ErrorResponse errorResponse = ErrorResponse.builder()
                .status(HttpServletResponse.SC_UNAUTHORIZED)
                .error("Unauthorized")
                .errorCode(errorCode)
                .message(StringUtils.hasText(errorMessage) ? errorMessage : authException.getMessage())
                .path(request.getRequestURI())
                .build();

        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.getWriter().write(objectMapper.writeValueAsString(errorResponse));
    }
}