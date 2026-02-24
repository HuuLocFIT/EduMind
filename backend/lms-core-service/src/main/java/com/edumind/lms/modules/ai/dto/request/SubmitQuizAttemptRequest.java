package com.edumind.lms.modules.ai.dto.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.NotEmpty;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SubmitQuizAttemptRequest {
    @NotNull(message = "Lesson ID is required")
    private Long lessonId;

    @NotNull(message = "Quiz ID is required")
    private Long quizId;

    @NotEmpty(message = "Answers are required")
    private List<Integer> answers;  // Array of answer indices matching question order
}
