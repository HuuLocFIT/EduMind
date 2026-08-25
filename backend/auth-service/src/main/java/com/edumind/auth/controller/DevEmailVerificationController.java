package com.edumind.auth.controller;

import com.edumind.auth.entity.User;
import com.edumind.auth.repository.UserRepository;
import com.edumind.common.exception.ResourceNotFoundException;
import com.edumind.common.response.MessageResponse;
import com.edumind.common.response.ApiResponse;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpStatus;
import org.springframework.context.annotation.Profile;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/auth/dev")
@Profile("!prod")
@ConditionalOnProperty(name = "app.auth.dev-verify-endpoint-enabled", havingValue = "true")
public class DevEmailVerificationController {
    private final UserRepository userRepository;

    public DevEmailVerificationController(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @PostMapping("/verify-email")
    @Transactional
    public ApiResponse<MessageResponse> verifyEmail(@RequestBody DevVerifyEmailRequest request) {
        User user = userRepository.findByEmail(request.email())
                .orElseThrow(() -> new ResourceNotFoundException("User not found with email: " + request.email()));
        user.setIsEmailVerified(true);
        userRepository.save(user);

        MessageResponse response = MessageResponse.builder()
                .status(HttpStatus.OK.value())
                .success(true)
                .message("Email verified for development testing")
                .build();
        return ApiResponse.success(response.getMessage(), response);
    }

    public record DevVerifyEmailRequest(String email) {}
}
