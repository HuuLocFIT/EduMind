package com.edumind.auth.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.Set;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserResponse {
    private Long id;
    private String username;
    private String email;
    private String firstName;
    private String lastName;
    private String phoneNumber;
    private String bio;

    private Set<String> roles;
    private Boolean isActive;
    private Boolean isEmailVerified;

    private Boolean is2faEnabled;

    private Boolean isTrial;
    private LocalDateTime trialStartDate;
    private LocalDateTime trialEndDate;

    private String profilePictureUrl;
    private String avatarUrl;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private LocalDateTime lastLoginAt;
}
