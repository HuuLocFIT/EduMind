package com.edumind.auth.security;

import com.edumind.auth.entity.RefreshToken;
import com.edumind.auth.service.AuthService;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Lazy;
import org.springframework.security.core.Authentication;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

import java.io.IOException;

/**
 * Handler for successful OAuth2 authentication
 *
 * Sets refresh token in HTTP-Only Cookie (same as normal login)
 * Only sends access token via URL query param to frontend
 */
@Component
public class OAuth2AuthenticationSuccessHandler extends SimpleUrlAuthenticationSuccessHandler {
    private static final Logger logger = LoggerFactory.getLogger(OAuth2AuthenticationSuccessHandler.class);

    private static final String REFRESH_TOKEN_COOKIE_NAME = "refreshToken";
    private static final int REFRESH_TOKEN_COOKIE_MAX_AGE = 7 * 24 * 60 * 60; // 7 days

    private final JwtTokenProvider tokenProvider;
    private final AuthService authService;

    @Value("${app.frontend.url}")
    private String frontendUrl;

    @Value("${app.cookie.secure:true}")
    private boolean cookieSecure;

    @Value("${app.cookie.same-site:Lax}")
    private String cookieSameSite;

    @Autowired
    public OAuth2AuthenticationSuccessHandler(
            JwtTokenProvider tokenProvider,
            @Lazy AuthService authService
    ) {
        this.tokenProvider = tokenProvider;
        this.authService = authService;
    }

    @Override
    public void onAuthenticationSuccess(
            HttpServletRequest request,
            HttpServletResponse response,
            Authentication authentication) throws IOException, ServletException {

        logger.info("✅ OAuth2 authentication successful");

        String targetUrl = determineTargetUrl(request, response, authentication);

        if (response.isCommitted()) {
            logger.debug("Response has already been committed. Unable to redirect.");
            return;
        }

        clearAuthenticationAttributes(request);
        getRedirectStrategy().sendRedirect(request, response, targetUrl);
    }

    protected String determineTargetUrl(
            HttpServletRequest request,
            HttpServletResponse response,
            Authentication authentication) {

        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();

        // 1. Generate access token
        String accessToken = tokenProvider.generateAccessToken(authentication);

        // 2. Create and save refresh token to database
        RefreshToken refreshToken = authService.createRefreshToken(userDetails.getId());

        logger.info("✅ Tokens generated and saved for OAuth2 user: {}",
                userDetails.getUsername());

        // 3. Set refresh token in HTTP-Only Cookie (SECURE)
        setRefreshTokenCookie(response, refreshToken.getToken());

        // 4. Redirect with ONLY access token in URL
        // refreshToken is in cookie, not exposed in URL
        return UriComponentsBuilder.fromUriString(frontendUrl + "/oauth2/redirect")
                .queryParam("token", accessToken)
                .build().toUriString();
    }

    /**
     * Set refresh token in HTTP-Only cookie
     * Same logic as AuthService for consistency
     */
    private void setRefreshTokenCookie(HttpServletResponse response, String token) {
        // Set cookie with SameSite attribute via header
        // (Cookie class doesn't support SameSite directly)
        String cookieValue = String.format(
                "%s=%s; Path=/; Max-Age=%d; HttpOnly; %sSameSite=%s",
                REFRESH_TOKEN_COOKIE_NAME,
                token,
                REFRESH_TOKEN_COOKIE_MAX_AGE,
                cookieSecure ? "Secure; " : "",
                cookieSameSite
        );

        response.addHeader("Set-Cookie", cookieValue);

        logger.debug("🍪 Refresh token cookie set for OAuth2 user");
    }
}