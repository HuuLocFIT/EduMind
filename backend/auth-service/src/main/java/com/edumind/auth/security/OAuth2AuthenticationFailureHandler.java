package com.edumind.auth.security;

import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationFailureHandler;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

/**
 * Handler for failed OAuth2 authentication
 */
@Component
public class OAuth2AuthenticationFailureHandler extends SimpleUrlAuthenticationFailureHandler {
    private static final Logger logger = LoggerFactory.getLogger(OAuth2AuthenticationFailureHandler.class);

    private static final String FALLBACK_MESSAGE = "OAuth2 authentication failed. Please try again.";

    @Value("${app.frontend.url}")
    private String frontendUrl;

    @Override
    public void onAuthenticationFailure(
            HttpServletRequest request,
            HttpServletResponse response,
            AuthenticationException exception) throws IOException, ServletException {

        logger.error("❌ OAuth2 authentication failed: {}", exception.getMessage(), exception);

        // Never let anything escape this handler. It runs inside the security filter chain,
        // outside the DispatcherServlet, so GlobalExceptionHandler cannot catch it: an
        // exception here becomes a container ERROR dispatch and the user gets a raw 401/500
        // instead of the actual reason.
        String targetUrl = frontendUrl + "/oauth2/redirect?error=" +
                URLEncoder.encode(resolveMessage(exception), StandardCharsets.UTF_8);

        try {
            getRedirectStrategy().sendRedirect(request, response, targetUrl);
        } catch (IOException | RuntimeException ex) {
            logger.error("❌ Failed to redirect to frontend after OAuth2 failure: {}", targetUrl, ex);
            if (!response.isCommitted()) {
                response.sendError(HttpServletResponse.SC_UNAUTHORIZED, FALLBACK_MESSAGE);
            }
        }
    }

    /**
     * {@code getLocalizedMessage()} is null for an OAuth2AuthenticationException built from a
     * bare error code, so it can't be URL-encoded directly.
     */
    private String resolveMessage(AuthenticationException exception) {
        String message = exception.getLocalizedMessage();
        if (StringUtils.hasText(message)) {
            return message;
        }
        if (exception instanceof OAuth2AuthenticationException oauth2Exception) {
            OAuth2Error error = oauth2Exception.getError();
            if (error != null) {
                if (StringUtils.hasText(error.getDescription())) {
                    return error.getDescription();
                }
                if (StringUtils.hasText(error.getErrorCode())) {
                    return error.getErrorCode();
                }
            }
        }
        return FALLBACK_MESSAGE;
    }
}