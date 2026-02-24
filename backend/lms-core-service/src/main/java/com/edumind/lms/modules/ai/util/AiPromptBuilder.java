package com.edumind.lms.modules.ai.util;

/**
 * Static utility for building AI prompts.
 * Truncates content to prevent token limit errors.
 */
public final class AiPromptBuilder {

    private AiPromptBuilder() {
    }

    /**
     * Build quiz generation prompt with content truncation.
     * Truncates lesson content to 30,000 characters to prevent Gemini token limit errors.
     *
     * @param lessonTitle   lesson title
     * @param lessonContent lesson article content
     * @param questionCount number of questions to generate (1-20)
     * @return formatted prompt string
     */
    public static String buildQuizPrompt(String lessonTitle, String lessonContent, int questionCount) {
        String truncated = lessonContent.length() > 30_000
                ? lessonContent.substring(0, 30_000) : lessonContent;
        return """
                You are an expert quiz generator.
                Generate %d multiple-choice questions based on the lesson below.
                Use the same language as the lesson content.

                LESSON TITLE: %s
                LESSON CONTENT:
                %s
                """.formatted(questionCount, lessonTitle, truncated);
    }
}
