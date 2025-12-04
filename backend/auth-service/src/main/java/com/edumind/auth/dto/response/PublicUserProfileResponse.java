package com.edumind.auth.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PublicUserProfileResponse {
    private Long id;
    private String firstName;
    private String lastName;
    private String displayName;
    private String avatarUrl;
    private String profilePictureUrl;
    private String bio;
}

