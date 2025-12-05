package com.edumind.lms.modules.course.client;

import com.edumind.common.response.ApiResponse;
import com.edumind.lms.modules.course.dto.response.UserPublicProfileResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

@FeignClient(name = "auth-service")
public interface UserClient {
    @GetMapping("/users/{userId}/public-profile")
    ApiResponse<UserPublicProfileResponse> getUserPublicProfile(@PathVariable Long userId);
}

