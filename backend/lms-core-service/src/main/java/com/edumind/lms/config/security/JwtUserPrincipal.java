package com.edumind.lms.config.security;

import org.springframework.security.core.GrantedAuthority;

import java.security.Principal;
import java.util.Collection;

/**
 * Simple authenticated principal built from JWT claims.
 */
public record JwtUserPrincipal(Long userId,
                               String username,
                               String email,
                               Collection<? extends GrantedAuthority> authorities) implements Principal {

    @Override
    public String getName() {
        if (userId != null) {
            return userId.toString();
        }
        return username != null ? username : "";
    }

    @Override
    public String toString() {
        return getName();
    }
}

