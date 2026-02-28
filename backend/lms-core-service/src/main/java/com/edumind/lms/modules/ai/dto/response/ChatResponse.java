package com.edumind.lms.modules.ai.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChatResponse {

    private String answer;

    private List<SourceLessonDto> sourceLessons;

    /**
     * Confidence tier derived from retrieval scores: "HIGH", "MEDIUM", or "GAP".
     */
    private String confidenceTier;
}

