package com.edumind.lms.modules.course.dto.response;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CertificateVerificationResponse {
    private String courseTitle;
    private String studentName;      // First name + last initial (GDPR)
    private String instructorName;
    private LocalDateTime completionDate;
    private LocalDateTime certificateIssuedAt;
    @JsonProperty("isValid")
    private boolean isValid;
}
