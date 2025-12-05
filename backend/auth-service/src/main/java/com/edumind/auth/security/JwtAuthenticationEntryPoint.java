package com.edumind.auth.security;

import com.edumind.common.constants.ErrorCode;
import com.edumind.common.response.ErrorResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.io.IOException;

@Component
public class JwtAuthenticationEntryPoint implements AuthenticationEntryPoint {

    private static final Logger logger = LoggerFactory.getLogger(JwtAuthenticationEntryPoint.class);
    
    private final ObjectMapper objectMapper;

    public JwtAuthenticationEntryPoint(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @Override
    public void commence(HttpServletRequest request, HttpServletResponse response,
                         AuthenticationException authException) throws IOException {

        String errorCode = (String) request.getAttribute(JwtAuthenticationFilter.JWT_ERROR_CODE_ATTRIBUTE);
        String errorMessage = (String) request.getAttribute(JwtAuthenticationFilter.JWT_ERROR_MESSAGE_ATTRIBUTE);

        if (!StringUtils.hasText(errorCode)) {
            String authHeader = request.getHeader("Authorization");
            if (!StringUtils.hasText(authHeader) || !authHeader.startsWith("Bearer ")) {
                errorCode = ErrorCode.TOKEN_MISSING;
                errorMessage = "Authentication token is required. Please provide a valid Bearer token.";
                logger.warn("❌ Unauthorized access - Missing token: {}", request.getRequestURI());
            } else {
                errorCode = ErrorCode.AUTH_FAILED;
                errorMessage = "Full authentication is required to access this resource";
                logger.error("❌ Unauthorized error: {}", authException.getMessage());
            }
        } else {
            logger.warn("❌ Unauthorized access - {}: {}", errorCode, request.getRequestURI());
        }

        ErrorResponse errorResponse = ErrorResponse.builder()
                .status(HttpServletResponse.SC_UNAUTHORIZED)
                .success(false)
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