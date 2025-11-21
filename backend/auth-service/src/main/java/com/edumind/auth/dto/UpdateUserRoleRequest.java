package com.edumind.auth.dto;

import jakarta.validation.constraints.*;
import lombok.*;

import java.util.Set;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdateUserRoleRequest {
    @NotEmpty(message = "At least one role is required")
    private Set<String> roles; // ["ROLE_STUDENT"], ["ROLE_TEACHER"], ["ROLE_ADMIN"]
}