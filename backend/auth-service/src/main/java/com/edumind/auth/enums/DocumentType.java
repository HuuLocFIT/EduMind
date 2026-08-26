package com.edumind.auth.enums;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum DocumentType {
    CERTIFICATE("certificate"),
    DEGREE("degree"),
    ID_CARD("id_card"),
    CV("cv");

    private final String value;

    DocumentType(String value) {
        this.value = value;
    }

    /**
     * JSON deserialization - case-insensitive
     * Accepts both enum name (ID_CARD) and value (id_card)
     */
    @JsonCreator
    public static DocumentType fromString(String type) {
        if (type == null || type.isEmpty()) {
            throw new IllegalArgumentException("Document type cannot be null or empty");
        }
        
        // Try exact match first (case-insensitive)
        String normalized = type.trim().toLowerCase().replace("-", "_");
        for (DocumentType dt : DocumentType.values()) {
            if (dt.value.equalsIgnoreCase(normalized) || 
                dt.name().equalsIgnoreCase(normalized)) {
                return dt;
            }
        }
        
        throw new IllegalArgumentException("Invalid document type: " + type +
                ". Valid types are: CERTIFICATE, DEGREE, ID_CARD, CV (or certificate, degree, id_card, cv)");
    }

    /**
     * JSON serialization - returns enum name (uppercase) for consistency with FE
     * This ensures FE receives "ID_CARD" instead of "id_card"
     */
    @JsonValue
    public String getValue() {
        return this.name(); // Return enum name (ID_CARD) instead of value (id_card)
    }
}

