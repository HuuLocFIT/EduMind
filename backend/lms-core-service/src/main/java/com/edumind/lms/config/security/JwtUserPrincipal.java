package com.edumind.lms.config.security;

import org.springframework.security.core.GrantedAuthority;

import java.security.Principal;
import java.time.LocalDateTime;
import java.util.Collection;

/**
 * Simple authenticated principal built from JWT claims.
 * Includes trialEndDate for TEACHER_TRIAL authorization validation.
 */
public record JwtUserPrincipal(Long userId,
                               String username,
                               String email,
                               Collection<? extends GrantedAuthority> authorities,
                               LocalDateTime trialEndDate) implements Principal {

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

    /**
     * Check if user has TEACHER_TRIAL role
     */
    public boolean isTrialTeacher() {
        return authorities.stream()
                .anyMatch(auth -> "ROLE_TEACHER_TRIAL".equals(auth.getAuthority()));
    }

    /**
     * Check if user has TEACHER role (full teacher, not trial)
     */
    public boolean isFullTeacher() {
        return authorities.stream()
                .anyMatch(auth -> "ROLE_TEACHER".equals(auth.getAuthority()));
    }

    /**
     * Check if user has ADMIN role
     */
    public boolean isAdmin() {
        return authorities.stream()
                .anyMatch(auth -> "ROLE_ADMIN".equals(auth.getAuthority()));
    }

    /**
     * Check if trial period has expired.
     * Returns false if user is not a trial teacher or has no trial end date.
     */
    public boolean isTrialExpired() {
        if (!isTrialTeacher() || trialEndDate == null) {
            return false;
        }
        return LocalDateTime.now().isAfter(trialEndDate);
    }

    /**
     * Check if user is an active teacher (TEACHER or non-expired TEACHER_TRIAL)
     */
    public boolean isActiveTeacher() {
        if (isFullTeacher()) {
            return true;
        }
        if (isTrialTeacher()) {
            return !isTrialExpired();
        }
        return false;
    }
}
