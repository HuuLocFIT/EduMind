package com.edumind.lms.modules.ai.dto.response;

import com.fasterxml.jackson.annotation.JsonPropertyDescription;

import java.util.List;

public record QuizQuestionDto(
        @JsonPropertyDescription("The quiz question text")
        String question,

        @JsonPropertyDescription("Exactly 4 answer choices")
        List<String> options,

        @JsonPropertyDescription("Zero-based index of the correct answer in options (0-3)")
        int correctIndex,

        @JsonPropertyDescription("Brief explanation of why the correct answer is right")
        String explanation
) {}
