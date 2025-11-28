package com.edumind.lms.modules.course.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateSectionRequest {
    @NotBlank(message = "Section title is required")
    @Size(max = 255, message = "Section title must not exceed 255 characters")
    private String title;

    @Size(max = 2000, message = "Section description must not exceed 2000 characters")
    private String description;
}
