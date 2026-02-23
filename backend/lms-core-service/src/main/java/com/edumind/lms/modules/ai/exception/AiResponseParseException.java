package com.edumind.lms.modules.ai.exception;

/**
 * Thrown when JSON from LLM cannot be parsed (e.g. markdown wrapper, malformed output).
 */
public class AiResponseParseException extends RuntimeException {

    public AiResponseParseException(String message) {
        super(message);
    }

    public AiResponseParseException(String message, Throwable cause) {
        super(message, cause);
    }
}
