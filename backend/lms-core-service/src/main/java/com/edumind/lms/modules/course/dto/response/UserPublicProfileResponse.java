package com.edumind.lms.modules.course.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserPublicProfileResponse {
    public Long id;
    public String firstName;
    public String lastName;
    public String displayName;
    public String avatarUrl;
    public String profilePictureUrl;
}
