package com.edumind.lms.config.security;

import com.edumind.common.constants.ErrorCode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {
    
    private final JwtTokenProvider tokenProvider;
    private final ObjectMapper objectMapper;

    public static final String JWT_ERROR_CODE_ATTRIBUTE = "jwt.errorCode";
    public static final String JWT_ERROR_MESSAGE_ATTRIBUTE = "jwt.errorMessage";

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        try {
            String jwt = resolveToken(request);

            // Case 1: No token provided - let Spring Security handle based on SecurityConfig
            // (permitAll endpoints will pass, authenticated endpoints will get 401 from EntryPoint)
            if (!StringUtils.hasText(jwt)) {
                filterChain.doFilter(request, response);
                return;
            }

            // Case 2: Validate token
            JwtValidationResult validationResult = tokenProvider.validateTokenWithDetails(jwt);

            if (validationResult.isValid()) {
                // Token valid - set authentication
                Claims claims = tokenProvider.parseClaims(jwt);
                var authorities = tokenProvider.extractAuthorities(claims);

                JwtUserPrincipal principal = new JwtUserPrincipal(
                        tokenProvider.extractUserId(claims),
                        claims.getSubject(),
                        claims.get("email", String.class),
                        authorities
                );

                UsernamePasswordAuthenticationToken authentication =
                        new UsernamePasswordAuthenticationToken(principal, null, authorities);
                authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));

                SecurityContextHolder.getContext().setAuthentication(authentication);
                log.debug("Set authentication for user: {} with roles: {}", 
                        claims.getSubject(), authorities);
                
                // Continue with valid authentication
                filterChain.doFilter(request, response);
            } else {
                // Case 3: Token invalid/expired - Return 401 IMMEDIATELY
                // DO NOT continue filter chain - this prevents @PreAuthorize from throwing 403
                log.warn("JWT validation failed: {} - {}", 
                        validationResult.getErrorCode(), validationResult.getErrorMessage());
                
                sendUnauthorizedResponse(response, request, validationResult);
                // Don't call filterChain.doFilter() - stop here!
            }

        } catch (Exception ex) {
            log.error("Could not set user authentication from JWT: {}", ex.getMessage());
            
            // Return 401 for any JWT processing error
            JwtValidationResult errorResult = JwtValidationResult.failure(
                    ErrorCode.TOKEN_INVALID, 
                    "Authentication processing failed"
            );
            sendUnauthorizedResponse(response, request, errorResult);
        }
    }

    /**
     * Send 401 Unauthorized response with error details
     * This allows frontend to detect token expiry and trigger refresh
     */
    private void sendUnauthorizedResponse(HttpServletResponse response, 
                                          HttpServletRequest request,
                                          JwtValidationResult validationResult) throws IOException {
        response.setStatus(HttpStatus.UNAUTHORIZED.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);

        Map<String, Object> errorBody = new HashMap<>();
        errorBody.put("status", HttpStatus.UNAUTHORIZED.value());
        errorBody.put("success", false);
        errorBody.put("error", "Unauthorized");
        errorBody.put("errorCode", validationResult.getErrorCode());
        errorBody.put("message", validationResult.getErrorMessage());
        errorBody.put("timestamp", LocalDateTime.now().toString());
        errorBody.put("requestId", UUID.randomUUID().toString().substring(0, 8));
        errorBody.put("path", request.getRequestURI());

        objectMapper.writeValue(response.getOutputStream(), errorBody);
    }

    private String resolveToken(HttpServletRequest request) {
        String bearerToken = request.getHeader("Authorization");
        if (StringUtils.hasText(bearerToken) && bearerToken.startsWith("Bearer ")) {
            return bearerToken.substring(7);
        }
        return null;
    }
}