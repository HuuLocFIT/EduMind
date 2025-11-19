package com.edumind.auth.security;

import com.edumind.auth.entity.User;
import com.fasterxml.jackson.annotation.JsonIgnore;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.oauth2.core.user.OAuth2User;

import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Custom UserDetails implementation
 * Implements both UserDetails (for local auth) and OAuth2User (for OAuth2 auth)
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class UserDetailsImpl implements UserDetails, OAuth2User {

    private Long id;
    private String username;
    private String email;

    @JsonIgnore
    private String password;

    private Collection<? extends GrantedAuthority> authorities;

    // For OAuth2 support
    private Map<String, Object> attributes;

    private boolean isActive;

    // ============================================
    // FACTORY METHODS
    // ============================================

    /**
     * Create UserDetailsImpl from User entity (for local authentication)
     */
    public static UserDetailsImpl build(User user) {
        List<GrantedAuthority> authorities = user.getRoles().stream()
                .map(role -> new SimpleGrantedAuthority(role.getName().name()))
                .collect(Collectors.toList());

        return new UserDetailsImpl(
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                user.getPassword(),
                authorities,
                null,  // No attributes for local auth
                user.getIsActive()
        );
    }

    /**
     * Create UserDetailsImpl from User entity with OAuth2 attributes
     */
    public static UserDetailsImpl create(User user, Map<String, Object> attributes) {
        List<GrantedAuthority> authorities = user.getRoles().stream()
                .map(role -> new SimpleGrantedAuthority(role.getName().name()))
                .collect(Collectors.toList());

        return new UserDetailsImpl(
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                user.getPassword(),
                authorities,
                attributes,  // OAuth2 attributes
                user.getIsActive()
        );
    }

    // ============================================
    // USERDETAILS INTERFACE METHODS
    // ============================================

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return authorities;
    }

    @Override
    public String getPassword() {
        return password;
    }

    @Override
    public String getUsername() {
        return username;
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return true;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return isActive;
    }

    // ============================================
    // OAUTH2USER INTERFACE METHODS
    // ============================================

    @Override
    public Map<String, Object> getAttributes() {
        return attributes;
    }

    @Override
    public String getName() {
        return String.valueOf(id);
    }

    // ============================================
    // CUSTOM HELPER METHODS
    // ============================================

    /**
     * Get user roles as string list
     */
    public List<String> getRoles() {
        return authorities.stream()
                .map(GrantedAuthority::getAuthority)
                .collect(Collectors.toList());
    }

    /**
     * Check if this is an OAuth2 user
     */
    public boolean isOAuth2User() {
        return attributes != null && !attributes.isEmpty();
    }
}