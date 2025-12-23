package com.edumind.lms.config.security;

import com.edumind.common.constants.ErrorCode;
import com.edumind.common.response.ErrorResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;

@Slf4j
@Component
@RequiredArgsConstructor
public class JwtAccessDeniedHandler implements AccessDeniedHandler {
    private final ObjectMapper objectMapper;

    @Override
    public void handle(HttpServletRequest request, HttpServletResponse response,
                      AccessDeniedException accessDeniedException) throws IOException {

        log.warn("Access denied - User does not have required role/permission: {} - {}", 
                request.getRequestURI(), accessDeniedException.getMessage());

        ErrorResponse errorResponse = ErrorResponse.builder()
                .status(HttpServletResponse.SC_FORBIDDEN)
                .success(false)
                .error("Forbidden")
                .errorCode(ErrorCode.ACCESS_DENIED)
                .message("You do not have permission to access this resource")
                .path(request.getRequestURI())
                .build();

        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setStatus(HttpServletResponse.SC_FORBIDDEN);
        response.getWriter().write(objectMapper.writeValueAsString(errorResponse));
    }
}

