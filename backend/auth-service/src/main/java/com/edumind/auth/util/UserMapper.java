package com.edumind.auth.util;

import com.edumind.auth.dto.response.UserResponse;
import com.edumind.auth.entity.Role;
import com.edumind.auth.entity.User;
import lombok.experimental.UtilityClass;

import java.util.Collections;
import java.util.Set;
import java.util.stream.Collectors;

@UtilityClass
public class UserMapper {
    public static UserResponse toUserResponse(User user) {
        if (user == null) return null;

        return UserResponse.builder()
                .id(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .phoneNumber(user.getPhoneNumber())
                .bio(user.getBio())
                .roles(extractRoleNames(user.getRoles()))
                .isActive(user.getIsActive())
                .isEmailVerified(user.getIsEmailVerified())
                .is2faEnabled(user.getIs2faEnabled())
                .isTrial(user.getIsTrial())
                .trialStartDate(user.getTrialStartDate())
                .trialEndDate(user.getTrialEndDate())
                .profilePictureUrl(user.getProfilePictureUrl())
                .avatarUrl(user.getAvatarUrl())
                .createdAt(user.getCreatedAt())
                .updatedAt(user.getUpdatedAt())
                .lastLoginAt(user.getLastLoginAt())
                .build();
    }

    private static Set<String> extractRoleNames(Set<Role> roles) {
        if (roles == null || roles.isEmpty()) {
            return Collections.emptySet();
        }
        return roles.stream()
                .map(Role::getName)
                .map(Enum::name)
                .collect(Collectors.toSet());
    }
}
