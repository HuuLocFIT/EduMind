package com.edumind.auth.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpgradeTrialRequest {
    private String adminNotes;  // Optional notes from admin
}
