package com.edumind.lms.config.security;

import com.edumind.common.constants.ErrorCode;
import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Slf4j
@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {
    private final JwtTokenProvider tokenProvider;

    // Request attribute keys to pass error information to JwtAuthenticationEntryPoint
    public static final String JWT_ERROR_CODE_ATTRIBUTE = "jwt.errorCode";
    public static final String JWT_ERROR_MESSAGE_ATTRIBUTE = "jwt.errorMessage";

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        try {
            String jwt = resolveToken(request);

            // Case 1: No token provided - let Spring Security handle based on SecurityConfig
            if (!StringUtils.hasText(jwt)) {
                filterChain.doFilter(request, response);
                return;
            }

            // Case 2 & 3: Validate token with details
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
            } else {
                // Token invalid - set error attributes to be handled by EntryPoint
                request.setAttribute(JWT_ERROR_CODE_ATTRIBUTE, validationResult.getErrorCode());
                request.setAttribute(JWT_ERROR_MESSAGE_ATTRIBUTE, validationResult.getErrorMessage());
                log.warn("JWT validation failed: {} - {}", 
                        validationResult.getErrorCode(), validationResult.getErrorMessage());
            }

        } catch (Exception ex) {
            log.error("Could not set user authentication from JWT: {}", ex.getMessage());
            request.setAttribute(JWT_ERROR_CODE_ATTRIBUTE, ErrorCode.TOKEN_INVALID);
            request.setAttribute(JWT_ERROR_MESSAGE_ATTRIBUTE, "Authentication processing failed");
        }

        filterChain.doFilter(request, response);
    }

    private String resolveToken(HttpServletRequest request) {
        String bearerToken = request.getHeader("Authorization");
        if (StringUtils.hasText(bearerToken) && bearerToken.startsWith("Bearer ")) {
            return bearerToken.substring(7);
        }
        return null;
    }
}