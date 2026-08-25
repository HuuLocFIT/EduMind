package com.edumind.auth.service;

import com.edumind.auth.dto.model.OAuth2UserInfo;
import com.edumind.auth.dto.model.OAuth2UserInfoFactory;
import com.edumind.auth.entity.User;
import com.edumind.auth.security.UserDetailsImpl;
import com.edumind.common.exception.BadRequestException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.security.oauth2.client.userinfo.DefaultOAuth2UserService;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

/**
 * Custom OAuth2 User Service
 * Handles OAuth2 user loading and processing
 */
@Service
public class CustomOAuth2UserService extends DefaultOAuth2UserService {
    private static final Logger logger = LoggerFactory.getLogger(CustomOAuth2UserService.class);

    @Autowired
    private final AuthService authService;
    
    /**
     * Use @Lazy to break circular dependency
     * SecurityConfig → CustomOAuth2UserService → AuthService → AuthenticationManager (from SecurityConfig)
     */
    @Autowired
    public CustomOAuth2UserService(@Lazy AuthService authService) {
        this.authService = authService;
    }

    /**
     * OAuth2Error code used for any failure raised while turning a provider profile
     * into a local user. The human-readable reason goes in the error *description*.
     */
    static final String PROCESSING_ERROR_CODE = "oauth2_processing_error";

    private static final String FALLBACK_MESSAGE =
            "Unable to complete sign-in with this provider. Please try again.";

    @Override
    public OAuth2User loadUser(OAuth2UserRequest userRequest) throws OAuth2AuthenticationException {
        logger.info("🔄 Loading OAuth2 user");

        // Load user from OAuth2 provider
        OAuth2User oAuth2User = super.loadUser(userRequest);

        return processOAuth2UserSafely(userRequest, oAuth2User);
    }

    /**
     * Wraps {@link #processOAuth2User} so every failure reaches
     * {@code OAuth2AuthenticationFailureHandler} as an {@link OAuth2AuthenticationException}
     * that still carries a readable message — the handler forwards that message to the
     * frontend as a query parameter.
     *
     * <p>Note {@code new OAuth2AuthenticationException(String)} takes an error *code*, not a
     * message: it builds an {@link OAuth2Error} with a null description, which leaves
     * {@code getMessage()} null. Always populate the description instead.
     *
     * <p>Package-private so this contract can be unit tested without {@code super.loadUser}
     * calling the real provider userinfo endpoint.
     */
    OAuth2User processOAuth2UserSafely(OAuth2UserRequest userRequest, OAuth2User oAuth2User) {
        try {
            return processOAuth2User(userRequest, oAuth2User);
        } catch (OAuth2AuthenticationException ex) {
            // Already an OAuth2 error; only re-wrap if it would surface a null message.
            if (StringUtils.hasText(ex.getMessage())) {
                throw ex;
            }
            logger.error("❌ OAuth2 error without a message, re-wrapping", ex);
            throw processingFailure(ex.getError().getDescription(), ex);
        } catch (Exception ex) {
            logger.error("❌ Error processing OAuth2 user", ex);
            throw processingFailure(ex.getMessage(), ex);
        }
    }

    private OAuth2AuthenticationException processingFailure(String reason, Exception cause) {
        String message = StringUtils.hasText(reason) ? reason : FALLBACK_MESSAGE;
        return new OAuth2AuthenticationException(
                new OAuth2Error(PROCESSING_ERROR_CODE, message, null), message, cause);
    }

    /**
     * Process OAuth2 user after loading from provider
     */
    private OAuth2User processOAuth2User(OAuth2UserRequest userRequest, OAuth2User oAuth2User) {
        String registrationId = userRequest.getClientRegistration()
                .getRegistrationId()
                .toUpperCase();

        logger.info("🔄 Processing OAuth2 user from provider: {}", registrationId);

        // Extract user info
        OAuth2UserInfo oAuth2UserInfo = OAuth2UserInfoFactory.getOAuth2UserInfo(
                registrationId,
                oAuth2User.getAttributes()
        );

        // Validate email
        if (!StringUtils.hasText(oAuth2UserInfo.getEmail())) {
            logger.error("❌ Email not found from OAuth2 provider");
            throw new BadRequestException("Email not found from OAuth2 provider");
        }

        // Process user (create or update)
        User user = authService.processOAuth2User(registrationId, oAuth2UserInfo);

        if (!user.getIsActive()) {
            logger.error("❌ User account is deactivated: {}", user.getEmail());
            throw processingFailure(
                "Your account has been deactivated. Please contact support.", null
            );
        }

        logger.info("✅ OAuth2 user processed successfully: {}", user.getEmail());

        return UserDetailsImpl.create(user, oAuth2User.getAttributes());
    }
}