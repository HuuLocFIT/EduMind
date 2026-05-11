package com.edumind.lms.modules.ai.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GenerateQuizRequest {
    @NotNull(message = "Lesson ID is required")
    private Long lessonId;

    @Min(value = 1, message = "Question count must be at least 1")
    @Max(value = 50, message = "Question count must be at most 50")
    @Builder.Default
    private int questionCount = 5;

    /**
     * Optional list of lesson IDs to use as content sources.
     * If null or empty, defaults to [lessonId] (single-lesson behavior).
     * All lessons must belong to the same course as lessonId.
     */
    private List<Long> sourceLessonIds;
}
