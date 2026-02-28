package com.edumind.lms.modules.ai.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GenerateQuizRequest {
    @NotNull(message = "Lesson ID is required")
    private Long lessonId;

    @Min(value = 1, message = "Question count must be at least 1")
    @Max(value = 20, message = "Question count must be at most 20")
    @Builder.Default
    private int questionCount = 5;
}
