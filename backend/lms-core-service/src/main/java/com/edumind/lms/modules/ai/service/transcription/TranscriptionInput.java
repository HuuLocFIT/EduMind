package com.edumind.lms.modules.ai.service.transcription;

import java.nio.file.Path;

public sealed interface TranscriptionInput permits TranscriptionInput.AudioFile, TranscriptionInput.DirectText {

    record AudioFile(Path tempFile) implements TranscriptionInput {
    }

    record DirectText(String text) implements TranscriptionInput {
    }
}

