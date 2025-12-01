package com.edumind.lms.modules.course.dto.response;

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
public class LessonProgressResponse {
    private Long id;
    private Long enrollmentId;
    private Long lessonId;
    private String lessonTitle;
    private Long studentId;

    // Progress
    private Boolean isCompleted;
    private LocalDateTime completedAt;

    // Video progress
    private Integer watchDuration;
    private Integer lastPosition;
    private Double watchPercentage;

    // Timestamps
    private LocalDateTime startedAt;
    private LocalDateTime updatedAt;
}
