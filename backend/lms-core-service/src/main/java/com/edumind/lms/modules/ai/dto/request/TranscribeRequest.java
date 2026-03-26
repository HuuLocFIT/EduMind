package com.edumind.lms.modules.ai.dto.request;

import jakarta.validation.constraints.NotBlank;

public record TranscribeRequest(
        @NotBlank(message = "Video URL is required")
        String videoUrl,
        String language   // nullable; "vi" or "en"
) {
}

