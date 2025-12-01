package com.edumind.lms.modules.course.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EnrollRequest {
    @NotNull(message = "Course ID is required")
    private Long courseId;
}
