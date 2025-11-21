package com.edumind.auth.dto;

import jakarta.validation.constraints.*;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReviewApplicationRequest {
    @NotBlank(message = "Action is required")
    @Pattern(regexp = "APPROVE|REJECT", message = "Action must be APPROVE or REJECT")
    private String action;  // APPROVE or REJECT

    // For APPROVE
    @Pattern(regexp = "TRIAL|FULL", message = "Teacher type must be TRIAL or FULL")
    private String teacherType;  // TRIAL (30 days) or FULL (permanent)

    // For REJECT
    private String rejectionReason;

    // Admin notes
    private String adminNotes;
}