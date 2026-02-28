package com.edumind.lms.modules.ai.exception;

public class AudioFileTooLargeException extends RuntimeException {
    public AudioFileTooLargeException(long sizeBytes) {
        super("Audio file size " + (sizeBytes / (1024 * 1024)) + "MB exceeds 25MB Groq limit");
    }
}

