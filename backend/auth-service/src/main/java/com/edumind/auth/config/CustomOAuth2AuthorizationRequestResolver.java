package com.edumind.auth.config;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.oauth2.client.web.DefaultOAuth2AuthorizationRequestResolver;
import org.springframework.security.oauth2.client.web.OAuth2AuthorizationRequestResolver;
import org.springframework.security.oauth2.core.endpoint.OAuth2AuthorizationRequest;

/**
 * Custom OAuth2AuthorizationRequestResolver to fix redirect URI issue
 * 
 * Problem: Spring Security OAuth2 uses {baseUrl} which resolves to private IP (192.168.x.x)
 * when prefer-ip-address=true in Eureka config. Google OAuth2 rejects private IPs.
 * 
 * Solution: Override redirect_uri to use configured gateway URL instead of private IP
 * Gateway URL can be configured via app.gateway.url in application.yml or GATEWAY_URL env var
 */
public class CustomOAuth2AuthorizationRequestResolver implements OAuth2AuthorizationRequestResolver {
    private static final String GATEWAY_OAUTH2_CALLBACK_PATH = "/api/auth/login/oauth2/code";
    
    private final OAuth2AuthorizationRequestResolver defaultResolver;
    private final String gatewayBaseUrl;
    
    public CustomOAuth2AuthorizationRequestResolver(
            ClientRegistrationRepository clientRegistrationRepository,
            @Value("${app.gateway.url}") String gatewayBaseUrl) {
        this.defaultResolver = new DefaultOAuth2AuthorizationRequestResolver(
                clientRegistrationRepository,
                "/oauth2/authorization"
        );
        this.gatewayBaseUrl = gatewayBaseUrl;
    }
    
    @Override
    public OAuth2AuthorizationRequest resolve(HttpServletRequest request) {
        OAuth2AuthorizationRequest originalRequest = defaultResolver.resolve(request);
        
        if (originalRequest == null) {
            return null;
        }
        
        // Override redirect_uri to use gateway URL instead of {baseUrl}
        String registrationId = (String) originalRequest.getAttribute("registration_id");
        if (registrationId == null) {
            return originalRequest;
        }
        
        String redirectUri = gatewayBaseUrl + GATEWAY_OAUTH2_CALLBACK_PATH + "/" + registrationId;
        
        return OAuth2AuthorizationRequest.from(originalRequest)
                .redirectUri(redirectUri)
                .build();
    }
    
    @Override
    public OAuth2AuthorizationRequest resolve(HttpServletRequest request, String clientRegistrationId) {
        OAuth2AuthorizationRequest originalRequest = defaultResolver.resolve(request, clientRegistrationId);
        
        if (originalRequest == null) {
            return null;
        }
        
        // Override redirect_uri to use gateway URL instead of {baseUrl}
        String redirectUri = gatewayBaseUrl + GATEWAY_OAUTH2_CALLBACK_PATH + "/" + clientRegistrationId;
        
        return OAuth2AuthorizationRequest.from(originalRequest)
                .redirectUri(redirectUri)
                .build();
    }
}

