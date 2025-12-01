package com.edumind.lms.modules.course.dto.response;

import com.edumind.lms.modules.course.enums.EnrollmentStatus;
import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class EnrollmentResponse {
    private Long id;
    private Long courseId;
    private String courseTitle;
    private String courseThumbnail;
    private Long studentId;

    // Progress
    private Integer progressPercentage;
    private Integer completedLessons;
    private Integer totalLessons;

    // Status
    private EnrollmentStatus status;

    // Completion
    private LocalDateTime completedAt;
    private String certificateUrl;

    // Timestamps
    private LocalDateTime enrolledAt;
    private LocalDateTime lastAccessedAt;
    private LocalDateTime expiresAt;
}