package com.edumind.auth.dto;

import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TrialStatusResponse {
    private Long userId;
    private String username;
    private String firstName;
    private String lastName;
    private Boolean isTrial;
    private LocalDateTime trialStartDate;
    private LocalDateTime trialEndDate;
    private Long daysRemaining;
    private Boolean isExpired;
}