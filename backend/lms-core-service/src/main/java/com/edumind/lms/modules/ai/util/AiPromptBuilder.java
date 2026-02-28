package com.edumind.lms.modules.ai.util;

import com.edumind.lms.modules.ai.dto.request.ChatRequest;
import com.edumind.lms.modules.ai.repository.LessonChunkProjection;

import java.util.List;

/**
 * Static utility for building AI prompts.
 * Truncates content to prevent token limit errors.
 */
public final class AiPromptBuilder {

    private AiPromptBuilder() {
    }

    public static String buildQuizPrompt(String lessonTitle, String lessonContent, int questionCount) {
        String truncated = truncate(lessonContent, 30_000);
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
        String truncated = truncate(lessonContent, 30_000);
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

    public static String buildRagPrompt(
            String question,
            List<LessonChunkProjection> chunks,
            List<ChatRequest.ConversationTurn> recentHistory,
            String confidenceHint
    ) {
        StringBuilder sb = new StringBuilder();

        sb.append("SYSTEM:\n");
        sb.append("You are an AI Tutor for an online course. Use the COURSE MATERIAL as your primary source.\n\n");
        sb.append("RESPONSE RULES — follow based on how well the material answers the question:\n\n");
        sb.append("Level 1 (Direct): The material clearly answers the question \u2192 answer using the material and cite it, then add a real-world analogy.\n");
        sb.append("Level 2 (Supplement): The material is related but incomplete \u2192 answer using the material plus your own IT knowledge.\n");
        sb.append("  Start your answer with: \"Based on the lesson and supplementary knowledge...\"\n");
        sb.append("Level 3 (Gap): The question is IT-related but not covered in the material \u2192 answer briefly from your general IT knowledge.\n");
        sb.append("  Start your answer with: \"The instructor hasn't covered this in the lesson, but in practice...\"\n");
        sb.append("Level 4 (Off-topic): The question is unrelated to IT or this course \u2192 politely decline to answer and explain that you're focused on this course only.\n\n");
        sb.append("EXPLANATION STYLE — always include:\n");
        sb.append("- A plain English explanation\n");
        sb.append("- One real-world analogy (e.g., \"Think of X like...\")\n");
        sb.append("- A short code example if applicable\n\n");
        sb.append("[SYSTEM_NOTE: ")
                .append(confidenceHint == null ? "MEDIUM" : confidenceHint)
                .append(" confidence based on retrieval scores]\n\n");

        if (!recentHistory.isEmpty()) {
            sb.append("CONVERSATION HISTORY (last ")
                    .append(recentHistory.size())
                    .append(" exchanges):\n");
            for (ChatRequest.ConversationTurn turn : recentHistory) {
                sb.append("Q: ").append(turn.question()).append("\n");
                sb.append("A: ").append(turn.answer()).append("\n");
            }
            sb.append("\n");
        }

        sb.append("COURSE MATERIAL (most relevant excerpts):\n");
        for (int i = 0; i < chunks.size(); i++) {
            LessonChunkProjection chunk = chunks.get(i);
            sb.append("[").append(i + 1).append("] ")
                    .append(truncate(chunk.getChunkText(), 2000))
                    .append("\n");
        }
        sb.append("\n");

        sb.append("CURRENT QUESTION: ").append(question).append("\n");

        return sb.toString();
    }

    private static String truncate(String text, int maxLength) {
        if (text == null) {
            return "";
        }
        return text.length() > maxLength ? text.substring(0, maxLength) : text;
    }
}

