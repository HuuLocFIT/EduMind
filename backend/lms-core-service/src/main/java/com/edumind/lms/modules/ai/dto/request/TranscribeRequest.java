package com.edumind.lms.modules.ai.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record TranscribeRequest(
        @NotBlank(message = "Video URL is required")
        String videoUrl,
        @Pattern(regexp = "^(en|vi)$", message = "Language must be either 'en' or 'vi'")
        String language
) {
}
