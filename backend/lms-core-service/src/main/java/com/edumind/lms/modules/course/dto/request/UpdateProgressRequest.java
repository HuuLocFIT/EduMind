package com.edumind.lms.modules.course.dto.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateProgressRequest {
    @NotNull(message = "Enrollment ID is required")
    private Long enrollmentId;

    @NotNull(message = "Lesson ID is required")
    private Long lessonId;

    @Min(value = 0, message = "Watch duration must be positive")
    private Integer watchDuration;

    @Min(value = 0, message = "Last position must be positive")
    private Integer lastPosition;
}
