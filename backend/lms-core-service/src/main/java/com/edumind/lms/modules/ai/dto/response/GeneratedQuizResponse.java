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
public class GeneratedQuizResponse {
    private Long id;
    private Long lessonId;
    private Long jobId;
    private int questionCount;  // convenience field — frontend no longer needs .length()
    private List<QuizQuestionDto> questions;
    private LocalDateTime createdAt;
}
