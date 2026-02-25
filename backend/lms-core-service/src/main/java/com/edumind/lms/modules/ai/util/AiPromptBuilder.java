package com.edumind.lms.modules.ai.util;

/**
 * Static utility for building AI prompts.
 * Truncates content to prevent token limit errors.
 */
public final class AiPromptBuilder {

    private AiPromptBuilder() {
    }

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

    public static String buildSummaryPrompt(String lessonTitle, String lessonContent) {
        String truncated = lessonContent.length() > 30_000
                ? lessonContent.substring(0, 30_000) : lessonContent;
        return """
                You are an IT English educator helping learners understand technical content.
                Summarize the lesson below. Return ONLY a valid JSON object with no markdown, no code block wrappers.

                Required JSON format:
                {
                  "summaryText": "<2-3 sentence summary of the lesson>",
                  "keyPoints": ["<key point 1>", "<key point 2>", "<key point 3>"],
                  "vocabulary": [
                    {"term": "<IT term>", "definition": "<plain English definition>"},
                    {"term": "<IT term>", "definition": "<plain English definition>"}
                  ]
                }

                LESSON TITLE: %s
                LESSON CONTENT:
                %s
                """.formatted(lessonTitle, truncated);
    }
}
