package com.edumind.lms.modules.ai.service.transcription;

/**
 * Internal signal exception used to map Groq HTTP 429 to a delayed job.
 */
public class GroqRateLimitException extends RuntimeException {
    public GroqRateLimitException() {
        super("Groq rate limit exceeded");
    }
}

