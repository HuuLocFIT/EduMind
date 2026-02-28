package com.edumind.lms.modules.ai.service.transcription;

import com.edumind.lms.modules.ai.dto.response.AiJobResponse;

public interface WhisperTranscriptionService {
    AiJobResponse requestTranscription(Long lessonId, String videoUrl, Long userId);

    void processTranscriptionAsync(Long jobId, Long lessonId, String videoUrl);
}

