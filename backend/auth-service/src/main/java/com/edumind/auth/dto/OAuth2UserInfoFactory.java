package com.edumind.auth.dto;

import com.edumind.common.exception.BadRequestException;

import java.util.Map;

/**
 * Factory to create OAuth2UserInfo based on provider
 */
public class OAuth2UserInfoFactory {

    public static OAuth2UserInfo getOAuth2UserInfo(String registrationId,
                                                   Map<String, Object> attributes) {
        if (registrationId.equalsIgnoreCase("google")) {
            return new GoogleOAuth2UserInfo(attributes);
        } else {
            throw new BadRequestException("Login with " + registrationId + " is not supported");
        }
    }
}