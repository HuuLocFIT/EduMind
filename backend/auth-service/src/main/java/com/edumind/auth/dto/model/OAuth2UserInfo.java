package com.edumind.auth.dto.model;

import java.util.Map;

/**
 * Interface for OAuth2 user information from different providers
 */
public interface OAuth2UserInfo {
    String getId();
    String getEmail();
    String getFirstName();
    String getLastName();
    String getImageUrl();
    Map<String, Object> getAttributes();
}