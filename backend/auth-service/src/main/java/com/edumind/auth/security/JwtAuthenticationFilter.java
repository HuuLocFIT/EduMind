package com.edumind.auth.security;

import com.edumind.common.constants.ErrorCode;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {
    
    private static final Logger logger = LoggerFactory.getLogger(JwtAuthenticationFilter.class);

    public static final String JWT_ERROR_CODE_ATTRIBUTE = "jwt.errorCode";
    public static final String JWT_ERROR_MESSAGE_ATTRIBUTE = "jwt.errorMessage";

    public static final String ERROR_TOKEN_EXPIRED = ErrorCode.TOKEN_EXPIRED;
    public static final String ERROR_TOKEN_INVALID = ErrorCode.TOKEN_INVALID;

    @Autowired
    private JwtTokenProvider tokenProvider;

    @Autowired
    private UserDetailsServiceImpl userDetailsService;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        try {
            String jwt = getJwtFromRequest(request);

            // Case 1: No token provided - let Spring Security handle based on SecurityConfig
            if (!StringUtils.hasText(jwt)) {
                filterChain.doFilter(request, response);
                return;
            }

            // Case 2 & 3: Validate token with details
            JwtValidationResult validationResult = tokenProvider.validateTokenWithDetails(jwt);

            if (validationResult.isValid()) {
                // Token valid - set authentication
                String username = tokenProvider.getUsernameFromToken(jwt);
                UserDetails userDetails = userDetailsService.loadUserByUsername(username);
                
                UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                        userDetails, null, userDetails.getAuthorities());
                authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));

                SecurityContextHolder.getContext().setAuthentication(authentication);
                logger.debug("✅ Set authentication for user: {}", username);
            } else {
                // Token invalid - set error attributes to be handled by EntryPoint
                request.setAttribute(JWT_ERROR_CODE_ATTRIBUTE, validationResult.getErrorType());
                request.setAttribute(JWT_ERROR_MESSAGE_ATTRIBUTE, validationResult.getErrorMessage());
                logger.warn("❌ JWT validation failed: {} - {}", 
                        validationResult.getErrorType(), validationResult.getErrorMessage());
            }

        } catch (Exception ex) {
            logger.error("❌ Could not set user authentication in security context", ex);
            request.setAttribute(JWT_ERROR_CODE_ATTRIBUTE, ERROR_TOKEN_INVALID);
            request.setAttribute(JWT_ERROR_MESSAGE_ATTRIBUTE, "Authentication processing failed");
        }

        filterChain.doFilter(request, response);
    }

    private String getJwtFromRequest(HttpServletRequest request) {
        String bearerToken = request.getHeader("Authorization");
        if (StringUtils.hasText(bearerToken) && bearerToken.startsWith("Bearer ")) {
            return bearerToken.substring(7);
        }
        return null;
    }
}