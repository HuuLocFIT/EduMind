package com.edumind.auth.dto;

import com.edumind.auth.enums.DocumentType;
import jakarta.validation.constraints.*;
import lombok.*;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TeacherApplicationRequest {
    @NotBlank(message = "First name is required")
    @Size(max = 50)
    private String firstName;

    @NotBlank(message = "Last name is required")
    @Size(max = 50)
    private String lastName;

    @NotBlank(message = "Email is required")
    @Email(message = "Email should be valid")
    private String email;

    @Pattern(regexp = "^[0-9+\\-\\s()]*$", message = "Invalid phone number format")
    private String phone;

    @NotBlank(message = "Subject is required")
    @Size(max = 200)
    private String subject;

    @Min(value = 0, message = "Experience years must be positive")
    private Integer experienceYears;

    @NotBlank(message = "Qualifications are required")
    private String qualifications;

    @NotEmpty(message = "At least one document is required")
    private List<DocumentInfo> documents;

    @Size(max = 2000, message = "Bio must not exceed 2000 characters")
    private String bio;

    @NotBlank(message = "Motivation is required")
    @Size(max = 1000, message = "Motivation must not exceed 1000 characters")
    private String motivation;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DocumentInfo {
        @NotBlank
        private String url;          // Cloudinary URL

        @NotNull(message = "Document type is required")
        private DocumentType type;   // CERTIFICATE, DEGREE, ID_CARD

        @NotBlank
        private String name;         // File name
    }
}