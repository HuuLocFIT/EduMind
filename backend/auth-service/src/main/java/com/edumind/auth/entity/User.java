package com.edumind.auth.entity;

import com.edumind.auth.enums.AuthProvider;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "users", indexes = {
        @Index(name = "idx_email", columnList = "email"),
        @Index(name = "idx_username", columnList = "username")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 50)
    private String username;

    @Column(nullable = false, unique = true, length = 100)
    private String email;

    // Password can be NULL for OAuth2 users
    @Column(length = 255)
    private String password;

    @Column(name = "first_name", length = 50)
    private String firstName;

    @Column(name = "last_name", length = 50)
    private String lastName;

    @Column(name = "phone_number", length = 20)
    private String phoneNumber;

    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(
            name = "user_roles",
            joinColumns = @JoinColumn(name = "user_id"),
            inverseJoinColumns = @JoinColumn(name = "role_id")
    )
    @Builder.Default
    private Set<Role> roles = new HashSet<>();

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;

    @Column(name = "is_email_verified", nullable = false)
    @Builder.Default
    private Boolean isEmailVerified = false;

    @Column(name = "profile_picture_url")
    private String profilePictureUrl;

    @Column(name = "is_trial")
    @Builder.Default
    private Boolean isTrial = false;

    @Column(name = "trial_start_date")
    private LocalDateTime trialStartDate;

    @Column(name = "trial_end_date")
    private LocalDateTime trialEndDate;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "last_login_at")
    private LocalDateTime lastLoginAt;

    // 2FA FIELDS
    @Column(name = "is_2fa_enabled", nullable = false)
    private Boolean is2faEnabled = false;

    @Column(name = "two_factor_secret")
    private String twoFactorSecret;

    @Column(name = "backup_codes", columnDefinition = "TEXT")
    private String backupCodes; // JSON array stored as string

    // OAUTH2 FIELDS
    @Enumerated(EnumType.STRING)
    @Column(length = 20, nullable = false)
    @Builder.Default
    private AuthProvider provider = AuthProvider.LOCAL;

    @Column(name = "provider_user_id")
    private String providerUserId;

    @Column(name = "avatar_url", length = 500)
    private String avatarUrl;

    // Helper methods
    public void addRole(Role role) {
        this.roles.add(role);
        role.getUsers().add(this);
    }

    public void removeRole(Role role) {
        this.roles.remove(role);
        role.getUsers().remove(this);
    }

    public boolean isTrialExpired() {
        if (!isTrial || trialEndDate == null) {
            return false;
        }
        return LocalDateTime.now().isAfter(trialEndDate);
    }

    /**
     * Check if user is using OAuth2 authentication
     */
    public boolean isOAuth2User() {
        return this.provider != null && this.provider.isOAuth2();
    }

    /**
     * Check if user has password (local user or OAuth2 user who set password)
     */
    public boolean hasPassword() {
        return this.password != null && !this.password.isEmpty();
    }

    /**
     * Check if 2FA is enabled
     */
    public boolean has2FA() {
        return Boolean.TRUE.equals(this.is2faEnabled);
    }
}