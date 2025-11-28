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

    @Override
    public OAuth2User loadUser(OAuth2UserRequest userRequest) throws OAuth2AuthenticationException {
        logger.info("🔄 Loading OAuth2 user");

        // Load user from OAuth2 provider
        OAuth2User oAuth2User = super.loadUser(userRequest);

        try {
            return processOAuth2User(userRequest, oAuth2User);
        } catch (Exception ex) {
            logger.error("❌ Error processing OAuth2 user", ex);
            throw new OAuth2AuthenticationException(ex.getMessage());
        }
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
            throw new OAuth2AuthenticationException(
                "Your account has been deactivated. Please contact support."
            );
        }

        logger.info("✅ OAuth2 user processed successfully: {}", user.getEmail());

        return UserDetailsImpl.create(user, oAuth2User.getAttributes());
    }
}