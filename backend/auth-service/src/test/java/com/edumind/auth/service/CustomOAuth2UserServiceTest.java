package com.edumind.auth.service;

import com.edumind.auth.dto.model.OAuth2UserInfo;
import com.edumind.auth.entity.User;
import com.edumind.common.exception.BadRequestException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.client.registration.ClientRegistration;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.core.AuthorizationGrantType;
import org.springframework.security.oauth2.core.OAuth2AccessToken;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.user.DefaultOAuth2User;
import org.springframework.security.oauth2.core.user.OAuth2User;

import java.time.Instant;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

/**
 * Unit tests for CustomOAuth2UserService.
 *
 * <p>Focus: the failure-wrapping contract. Any exception raised while processing an
 * OAuth2 user must surface as an {@link OAuth2AuthenticationException} that still
 * carries a readable message, because {@code OAuth2AuthenticationFailureHandler}
 * forwards that message to the frontend as a query parameter.
 */
@ExtendWith(MockitoExtension.class)
class CustomOAuth2UserServiceTest {

    @Mock
    private AuthService authService;

    private CustomOAuth2UserService customOAuth2UserService;
    private OAuth2UserRequest userRequest;
    private OAuth2User googleUser;

    @BeforeEach
    void setUp() {
        customOAuth2UserService = new CustomOAuth2UserService(authService);

        ClientRegistration googleRegistration = ClientRegistration
                .withRegistrationId("google")
                .clientId("test-client-id")
                .clientSecret("test-client-secret")
                .authorizationGrantType(AuthorizationGrantType.AUTHORIZATION_CODE)
                .redirectUri("{baseUrl}/login/oauth2/code/{registrationId}")
                .authorizationUri("https://accounts.google.com/o/oauth2/v2/auth")
                .tokenUri("https://oauth2.googleapis.com/token")
                .userInfoUri("https://www.googleapis.com/oauth2/v3/userinfo")
                .userNameAttributeName("sub")
                .build();

        OAuth2AccessToken accessToken = new OAuth2AccessToken(
                OAuth2AccessToken.TokenType.BEARER,
                "test-access-token",
                Instant.now(),
                Instant.now().plusSeconds(3600));

        userRequest = new OAuth2UserRequest(googleRegistration, accessToken);

        googleUser = new DefaultOAuth2User(
                List.of(new SimpleGrantedAuthority("ROLE_USER")),
                Map.of(
                        "sub", "1234567890",
                        "email", "existing@example.com",
                        "given_name", "Existing",
                        "family_name", "User"),
                "sub");
    }

    @Nested
    @DisplayName("Failure wrapping")
    class FailureWrapping {

        @Test
        @DisplayName("Should preserve the message when the account already exists as a LOCAL account")
        void shouldPreserveMessageWhenEmailAlreadyRegisteredLocally() {
            String originalMessage = "Email already registered. Please use email/password login.";
            when(authService.processOAuth2User(anyString(), any(OAuth2UserInfo.class)))
                    .thenThrow(new BadRequestException(originalMessage));

            OAuth2AuthenticationException exception = assertThrows(
                    OAuth2AuthenticationException.class,
                    () -> customOAuth2UserService.processOAuth2UserSafely(userRequest, googleUser));

            // The failure handler relies on getMessage()/getLocalizedMessage() being usable.
            assertNotNull(exception.getMessage(), "message must not be null - the failure handler URL-encodes it");
            assertEquals(originalMessage, exception.getMessage());
            assertEquals(originalMessage, exception.getLocalizedMessage());
        }

        @Test
        @DisplayName("Should expose the reason as the OAuth2Error description, not as the error code")
        void shouldPutReasonInDescriptionNotErrorCode() {
            String originalMessage = "Email already registered. Please use email/password login.";
            when(authService.processOAuth2User(anyString(), any(OAuth2UserInfo.class)))
                    .thenThrow(new BadRequestException(originalMessage));

            OAuth2AuthenticationException exception = assertThrows(
                    OAuth2AuthenticationException.class,
                    () -> customOAuth2UserService.processOAuth2UserSafely(userRequest, googleUser));

            assertEquals(originalMessage, exception.getError().getDescription());
            assertNotEquals(originalMessage, exception.getError().getErrorCode(),
                    "the human-readable reason belongs in the description, not the error code");
        }

        @Test
        @DisplayName("Should keep the original exception as the cause")
        void shouldKeepOriginalExceptionAsCause() {
            BadRequestException original = new BadRequestException("Account configuration error. Please contact support.");
            when(authService.processOAuth2User(anyString(), any(OAuth2UserInfo.class))).thenThrow(original);

            OAuth2AuthenticationException exception = assertThrows(
                    OAuth2AuthenticationException.class,
                    () -> customOAuth2UserService.processOAuth2UserSafely(userRequest, googleUser));

            assertSame(original, exception.getCause());
        }

        @Test
        @DisplayName("Should still produce a usable message when the underlying exception has none")
        void shouldFallBackWhenUnderlyingMessageIsNull() {
            when(authService.processOAuth2User(anyString(), any(OAuth2UserInfo.class)))
                    .thenThrow(new IllegalStateException());

            OAuth2AuthenticationException exception = assertThrows(
                    OAuth2AuthenticationException.class,
                    () -> customOAuth2UserService.processOAuth2UserSafely(userRequest, googleUser));

            assertNotNull(exception.getMessage());
            assertFalse(exception.getMessage().isBlank());
        }

        @Test
        @DisplayName("Should not double-wrap an OAuth2AuthenticationException that already has a description")
        void shouldNotDoubleWrapExistingOAuth2Exception() {
            User deactivated = new User();
            deactivated.setEmail("existing@example.com");
            deactivated.setIsActive(false);
            when(authService.processOAuth2User(anyString(), any(OAuth2UserInfo.class))).thenReturn(deactivated);

            OAuth2AuthenticationException exception = assertThrows(
                    OAuth2AuthenticationException.class,
                    () -> customOAuth2UserService.processOAuth2UserSafely(userRequest, googleUser));

            assertNotNull(exception.getMessage(), "deactivated-account error must reach the frontend too");
            assertTrue(exception.getMessage().contains("deactivated"),
                    "expected the deactivated-account reason, got: " + exception.getMessage());
        }
    }

    @Nested
    @DisplayName("Validation")
    class Validation {

        @Test
        @DisplayName("Should reject a provider response without an email, with a readable message")
        void shouldRejectMissingEmail() {
            OAuth2User userWithoutEmail = new DefaultOAuth2User(
                    List.of(new SimpleGrantedAuthority("ROLE_USER")),
                    Map.of("sub", "1234567890"),
                    "sub");

            OAuth2AuthenticationException exception = assertThrows(
                    OAuth2AuthenticationException.class,
                    () -> customOAuth2UserService.processOAuth2UserSafely(userRequest, userWithoutEmail));

            assertNotNull(exception.getMessage());
            assertTrue(exception.getMessage().contains("Email not found"),
                    "expected the missing-email reason, got: " + exception.getMessage());
        }
    }
}
