package com.edumind.auth.enums;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Unit tests for DocumentType enum
 * Tests case-insensitive parsing, dash normalization, and error messages
 */
@DisplayName("DocumentType Enum Tests")
class DocumentTypeTest {

    @Test
    @DisplayName("fromString should accept uppercase enum name")
    void testFromStringUppercase() {
        assertEquals(DocumentType.CERTIFICATE, DocumentType.fromString("CERTIFICATE"));
        assertEquals(DocumentType.DEGREE, DocumentType.fromString("DEGREE"));
        assertEquals(DocumentType.ID_CARD, DocumentType.fromString("ID_CARD"));
        assertEquals(DocumentType.CV, DocumentType.fromString("CV"));
    }

    @Test
    @DisplayName("fromString should accept lowercase enum name")
    void testFromStringLowercase() {
        assertEquals(DocumentType.CERTIFICATE, DocumentType.fromString("certificate"));
        assertEquals(DocumentType.DEGREE, DocumentType.fromString("degree"));
        assertEquals(DocumentType.ID_CARD, DocumentType.fromString("id_card"));
        assertEquals(DocumentType.CV, DocumentType.fromString("cv"));
    }

    @Test
    @DisplayName("fromString should accept mixed case")
    void testFromStringMixedCase() {
        assertEquals(DocumentType.CERTIFICATE, DocumentType.fromString("Certificate"));
        assertEquals(DocumentType.DEGREE, DocumentType.fromString("Degree"));
        assertEquals(DocumentType.ID_CARD, DocumentType.fromString("Id_Card"));
        assertEquals(DocumentType.CV, DocumentType.fromString("cV"));
    }

    @Test
    @DisplayName("fromString should normalize dashes to underscores")
    void testFromStringDashNormalization() {
        assertEquals(DocumentType.ID_CARD, DocumentType.fromString("id-card"));
        assertEquals(DocumentType.ID_CARD, DocumentType.fromString("ID-CARD"));
    }

    @Test
    @DisplayName("fromString should throw IllegalArgumentException for invalid type")
    void testFromStringInvalidType() {
        IllegalArgumentException exception = assertThrows(
            IllegalArgumentException.class,
            () -> DocumentType.fromString("INVALID")
        );

        String message = exception.getMessage();
        assertTrue(message.contains("Invalid document type"), "Message should indicate invalid type");
        assertTrue(message.contains("CERTIFICATE"), "Message should list CERTIFICATE");
        assertTrue(message.contains("DEGREE"), "Message should list DEGREE");
        assertTrue(message.contains("ID_CARD"), "Message should list ID_CARD");
        assertTrue(message.contains("CV"), "Message should list CV");
        assertTrue(message.contains("certificate"), "Message should list lowercase certificate");
        assertTrue(message.contains("degree"), "Message should list lowercase degree");
        assertTrue(message.contains("id_card"), "Message should list lowercase id_card");
        assertTrue(message.contains("cv"), "Message should list lowercase cv");
    }

    @Test
    @DisplayName("fromString should throw for null input")
    void testFromStringNull() {
        assertThrows(
            IllegalArgumentException.class,
            () -> DocumentType.fromString(null),
            "Should throw IllegalArgumentException for null input"
        );
    }

    @Test
    @DisplayName("fromString should throw for empty string")
    void testFromStringEmpty() {
        assertThrows(
            IllegalArgumentException.class,
            () -> DocumentType.fromString(""),
            "Should throw IllegalArgumentException for empty string"
        );
    }

    @Test
    @DisplayName("getValue should return enum name")
    void testGetValue() {
        assertEquals("CERTIFICATE", DocumentType.CERTIFICATE.getValue());
        assertEquals("DEGREE", DocumentType.DEGREE.getValue());
        assertEquals("ID_CARD", DocumentType.ID_CARD.getValue());
        assertEquals("CV", DocumentType.CV.getValue());
    }
}
