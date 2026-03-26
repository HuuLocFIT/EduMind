package com.edumind.lms.modules.course.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.PositiveOrZero;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ConfirmVideoUploadRequest {
    @NotBlank(message = "Cloudinary URL is required")
    private String cloudinaryUrl;

    @NotBlank(message = "Public ID is required")
    private String publicId;

    @PositiveOrZero(message = "Duration must be zero or positive")
    private Integer duration;
}
