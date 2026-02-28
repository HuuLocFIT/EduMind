package com.edumind.lms.modules.ai.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class QuizAttemptResponse {
    private Long id;
    private Long lessonId;
    private Long quizId;
    private Integer score;
    private Integer total;
    private Integer percentage;  // Calculated: Math.round(score / total * 100)
    private List<Integer> answers;  // Array of chosen answer indices
    private LocalDateTime completedAt;
    private List<QuizQuestionDto> quizQuestions;  // Full questions with correctIndex and explanation for review
}
