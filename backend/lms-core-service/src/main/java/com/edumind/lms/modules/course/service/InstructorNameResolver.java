package com.edumind.lms.modules.course.service;

import com.edumind.common.response.ApiResponse;
import com.edumind.lms.modules.course.client.UserClient;
import com.edumind.lms.modules.course.dto.response.UserPublicProfileResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class InstructorNameResolver {
    private final UserClient userClient;

    public String resolveInstructorName(Long instructorId) {
        String defaultName = "Instructor #" + instructorId;

        try {
            ApiResponse<UserPublicProfileResponse> response = userClient.getUserPublicProfile(instructorId);
            if (response == null || response.getData() == null) {
                return defaultName;
            }

            UserPublicProfileResponse user = response.getData();

            if (user.getDisplayName() != null && !user.getDisplayName().isBlank()) {
                return user.getDisplayName();
            }

            StringBuilder nameBuilder = new StringBuilder();
            if (user.getFirstName() != null && !user.getFirstName().isBlank()) {
                nameBuilder.append(user.getFirstName().trim());
            }
            if (user.getLastName() != null && !user.getLastName().isBlank()) {
                if (nameBuilder.length() > 0) {
                    nameBuilder.append(" ");
                }
                nameBuilder.append(user.getLastName().trim());
            }

            if (nameBuilder.length() > 0) {
                return nameBuilder.toString();
            }
        } catch (Exception e) {
            log.warn("Failed to fetch instructor public profile for id {}. Using default name.", instructorId, e);
        }

        return defaultName;
    }
}


