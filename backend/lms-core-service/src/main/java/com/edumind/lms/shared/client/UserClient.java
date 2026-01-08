package com.edumind.lms.shared.client;

import com.edumind.common.response.ApiResponse;
import com.edumind.lms.modules.course.dto.response.UserPublicProfileResponse;
import com.edumind.lms.shared.dto.UserResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

@FeignClient(name = "auth-service", configuration = com.edumind.lms.config.FeignConfig.class)
public interface UserClient {
    @GetMapping("/users/{userId}/public-profile")
    ApiResponse<UserPublicProfileResponse> getUserPublicProfile(@PathVariable Long userId);

    @GetMapping("/users/me")
    ApiResponse<UserResponse> getCurrentUser();
}

