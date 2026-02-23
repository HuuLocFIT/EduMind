package com.edumind.lms.modules.ai.util;

import com.edumind.lms.modules.ai.exception.AiResponseParseException;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Utility to strip markdown wrappers from LLM JSON responses.
 * Gemini often wraps JSON in ```json ... ``` which causes parse failures.
 * CRITICAL: Use before every ObjectMapper.readValue() on LLM output.
 */
public final class JsonExtractor {

    private static final Pattern JSON_BLOCK = Pattern.compile("```(?:json)?\\s*([\\s\\S]*?)```", Pattern.CASE_INSENSITIVE);
    // Reluctant *? avoids matching from the first { to the LAST } when Gemini returns multiple
    // JSON blocks in one response. Limitation: won't correctly handle top-level nested objects
    // deeper than the first closing brace — acceptable for Phase 2/3 single-JSON prompts.
    private static final Pattern JSON_OBJECT = Pattern.compile("\\{[\\s\\S]*?\\}");
    private static final Pattern JSON_ARRAY  = Pattern.compile("\\[[\\s\\S]*?\\]");

    private JsonExtractor() {
    }

    /**
     * Extract clean JSON string from raw LLM response.
     * Handles: ```json {...} ```, ``` {...} ```, or raw {...} / [...]
     *
     * @param raw LLM response string, possibly wrapped in markdown
     * @return clean JSON string suitable for ObjectMapper
     * @throws AiResponseParseException if no valid JSON found
     */
    public static String extract(String raw) {
        if (raw == null || raw.isBlank()) {
            throw new AiResponseParseException("Empty or null LLM response");
        }
        String trimmed = raw.trim();

        // Try markdown code block first
        Matcher blockMatcher = JSON_BLOCK.matcher(trimmed);
        if (blockMatcher.find()) {
            String extracted = blockMatcher.group(1).trim();
            if (!extracted.isBlank()) {
                return extracted;
            }
        }

        // Try raw JSON - object or array (match by leading character to avoid partial match)
        if (trimmed.startsWith("[")) {
            Matcher arrayMatcher = JSON_ARRAY.matcher(trimmed);
            if (arrayMatcher.find()) {
                return arrayMatcher.group();
            }
        }
        if (trimmed.startsWith("{")) {
            Matcher objectMatcher = JSON_OBJECT.matcher(trimmed);
            if (objectMatcher.find()) {
                return objectMatcher.group();
            }
        }
        // Fallback: try object then array (for embedded JSON)
        Matcher objectMatcher = JSON_OBJECT.matcher(trimmed);
        if (objectMatcher.find()) {
            return objectMatcher.group();
        }
        Matcher arrayMatcher = JSON_ARRAY.matcher(trimmed);
        if (arrayMatcher.find()) {
            return arrayMatcher.group();
        }

        throw new AiResponseParseException("No valid JSON found in LLM response: " + trimmed.substring(0, Math.min(200, trimmed.length())) + "...");
    }
}
