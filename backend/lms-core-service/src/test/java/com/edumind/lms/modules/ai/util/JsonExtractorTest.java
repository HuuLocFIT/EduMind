package com.edumind.lms.modules.ai.util;

import com.edumind.lms.modules.ai.exception.AiResponseParseException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("JsonExtractor Unit Tests")
class JsonExtractorTest {

    @Test
    void extract_fromMarkdownCodeBlock_withJsonLang() {
        String raw = "```json\n{\"key\": \"value\"}\n```";
        String result = JsonExtractor.extract(raw);
        assertEquals("{\"key\": \"value\"}", result);
    }

    @Test
    void extract_fromMarkdownCodeBlock_withoutLang() {
        String raw = "```\n{\"foo\": 123}\n```";
        String result = JsonExtractor.extract(raw);
        assertEquals("{\"foo\": 123}", result);
    }

    @Test
    void extract_fromRawJsonObject() {
        String raw = "{\"a\": 1, \"b\": \"text\"}";
        String result = JsonExtractor.extract(raw);
        assertEquals(raw, result);
    }

    @Test
    void extract_fromRawJsonArray() {
        String raw = "[{\"id\": 1}, {\"id\": 2}]";
        String result = JsonExtractor.extract(raw);
        assertEquals(raw, result);
    }

    @Test
    void extract_throwsWhenEmpty() {
        assertThrows(AiResponseParseException.class, () -> JsonExtractor.extract(""));
        assertThrows(AiResponseParseException.class, () -> JsonExtractor.extract("   "));
        assertThrows(AiResponseParseException.class, () -> JsonExtractor.extract(null));
    }

    @Test
    void extract_throwsWhenNoJson() {
        assertThrows(AiResponseParseException.class, () -> JsonExtractor.extract("This is plain text"));
    }

    // Issue 8: Missing test — JSON object embedded in prose text (fallback path, lines 59-66)
    @Test
    @DisplayName("extract finds JSON object embedded in prose text (fallback path)")
    void extract_fromProseWithEmbeddedObject() {
        String raw = "Here is the result you requested: {\"score\": 95, \"grade\": \"A\"} Hope that helps!";
        String result = JsonExtractor.extract(raw);
        // Should extract the embedded JSON object
        assertTrue(result.contains("\"score\""), "Should extract the embedded JSON object");
        assertTrue(result.startsWith("{"), "Extracted JSON should start with {");
    }

    // Issue 8: Missing test — JSON array embedded in prose text (fallback array path)
    @Test
    @DisplayName("extract finds JSON array embedded in prose text (fallback path)")
    void extract_fromProseWithEmbeddedArray() {
        // Use a flat array (non-nested) — reluctant *? stops at the FIRST ], which is correct
        // for a flat array. Nested object arrays like [{...},...] are handled by the JSON_OBJECT
        // fallback because they start with [ but reluctant matching would stop inside an object.
        String raw = "The topics covered are: [\"algebra\", \"geometry\", \"calculus\"] - enjoy!";
        String result = JsonExtractor.extract(raw);
        assertTrue(result.contains("\"algebra\""), "Should extract the embedded JSON array");
        assertTrue(result.startsWith("["), "Extracted JSON should start with [");
        assertTrue(result.endsWith("]"), "Extracted JSON should end with ]");
    }
}
