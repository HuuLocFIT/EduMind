package com.edumind.lms.modules.ai.service.transcription;

import java.io.IOException;

public interface AudioExtractor {
    boolean supports(String url);

    TranscriptionInput extract(String url) throws IOException, InterruptedException;
}

