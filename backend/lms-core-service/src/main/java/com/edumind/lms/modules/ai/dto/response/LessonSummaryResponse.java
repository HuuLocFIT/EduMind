package com.edumind.lms.modules.ai.dto.response;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@Builder
public class LessonSummaryResponse {
    private Long lessonId;
    private String summaryText;
    private List<String> keyPoints;
    private List<VocabularyItem> vocabulary;
    private LocalDateTime updatedAt;
}

