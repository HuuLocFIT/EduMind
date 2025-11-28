package com.edumind.auth.enums;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum DocumentType {
    CERTIFICATE("certificate"),
    DEGREE("degree"),
    ID_CARD("id_card");

    private final String value;

    DocumentType(String value) {
        this.value = value;
    }

    /**
     * JSON deserialization - case-insensitive
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
                ". Valid types are: certificate, degree, id_card");
    }

    /**
     * JSON serialization - returns lowercase value
     */
    @JsonValue
    public String getValue() {
        return value;
    }
}

