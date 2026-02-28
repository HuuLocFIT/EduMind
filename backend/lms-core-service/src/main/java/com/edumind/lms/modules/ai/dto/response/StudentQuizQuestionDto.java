package com.edumind.lms.modules.ai.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Quiz question DTO for students (without correct answer and explanation).
 * Used when fetching quiz for taking.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StudentQuizQuestionDto {
    private String question;
    private List<String> options;
    // correctIndex and explanation are intentionally omitted
}
