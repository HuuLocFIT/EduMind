package com.edumind.auth.security;

import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.test.util.ReflectionTestUtils;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Unit tests for OAuth2AuthenticationFailureHandler.
 *
 * <p>This handler is the last chance to turn a failed OAuth2 login into something the
 * frontend can display. If it throws, the exception escapes the security filter chain
 * and the servlet container forwards to {@code /error}, where the user sees a raw
 * {@code ERR_2005} JSON instead of the real reason. So the hard requirement is:
 * <b>always redirect, never throw</b>.
 */
class OAuth2AuthenticationFailureHandlerTest {

    private static final String FRONTEND_URL = "http://localhost:3000";

    private OAuth2AuthenticationFailureHandler handler;
    private MockHttpServletRequest request;
    private MockHttpServletResponse response;

    @BeforeEach
    void setUp() {
        handler = new OAuth2AuthenticationFailureHandler();
        ReflectionTestUtils.setField(handler, "frontendUrl", FRONTEND_URL);
        request = new MockHttpServletRequest("GET", "/login/oauth2/code/google");
        response = new MockHttpServletResponse();
    }

    @Test
    @DisplayName("Should redirect to the frontend with the failure reason as a query parameter")
    void shouldRedirectWithReason() throws Exception {
        String reason = "Email already registered. Please use email/password login.";
        AuthenticationException exception = new OAuth2AuthenticationException(
                new OAuth2Error("oauth2_processing_error", reason, null), reason);

        handler.onAuthenticationFailure(request, response, exception);

        assertEquals(HttpServletResponse.SC_MOVED_TEMPORARILY, response.getStatus());
        assertEquals(
                FRONTEND_URL + "/oauth2/redirect?error=" + URLEncoder.encode(reason, StandardCharsets.UTF_8),
                response.getRedirectedUrl());
    }

    @Test
    @DisplayName("Should redirect instead of throwing when the exception carries no message")
    void shouldRedirectWhenMessageIsNull() {
        // OAuth2AuthenticationException(String) treats its argument as an error CODE and
        // leaves the description - and therefore getMessage() - null.
        AuthenticationException exception = new OAuth2AuthenticationException("some_error_code");
        assertNull(exception.getMessage(), "precondition: this constructor yields a null message");

        assertDoesNotThrow(() -> handler.onAuthenticationFailure(request, response, exception));

        assertEquals(HttpServletResponse.SC_MOVED_TEMPORARILY, response.getStatus());
        assertNotNull(response.getRedirectedUrl());
        assertTrue(response.getRedirectedUrl().startsWith(FRONTEND_URL + "/oauth2/redirect?error="),
                "expected a redirect to the frontend, got: " + response.getRedirectedUrl());
    }

    @Test
    @DisplayName("Should never leave the response uncommitted for any failure")
    void shouldAlwaysCommitARedirect() {
        AuthenticationException exception = new OAuth2AuthenticationException(
                new OAuth2Error("invalid_token_response"));

        assertDoesNotThrow(() -> handler.onAuthenticationFailure(request, response, exception));

        assertEquals(HttpServletResponse.SC_MOVED_TEMPORARILY, response.getStatus());
        assertNotNull(response.getRedirectedUrl());
    }

    @Test
    @DisplayName("Should URL-encode reasons containing characters that break a query string")
    void shouldEncodeSpecialCharacters() throws Exception {
        String reason = "You're already signed up with GOOGLE account & cannot use ?this? login";
        AuthenticationException exception = new OAuth2AuthenticationException(
                new OAuth2Error("oauth2_processing_error", reason, null), reason);

        handler.onAuthenticationFailure(request, response, exception);

        String redirectedUrl = response.getRedirectedUrl();
        assertNotNull(redirectedUrl);
        assertFalse(redirectedUrl.substring(redirectedUrl.indexOf("error=")).contains("&"),
                "the reason must be encoded so it cannot inject extra query parameters: " + redirectedUrl);
        assertTrue(redirectedUrl.contains(URLEncoder.encode(reason, StandardCharsets.UTF_8)));
    }
}
