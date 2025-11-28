package com.edumind.lms.modules.course.dto.request;

import com.edumind.lms.modules.course.enums.CourseLevel;
import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateCourseRequest {
    @NotBlank(message = "Title is required")
    @Size(max = 255, message = "Title must not exceed 255 characters")
    private String title;

    @NotBlank(message = "Slug is required")
    @Pattern(regexp = "^[a-z0-9]+(?:-[a-z0-9]+)*$", message = "Slug must be lowercase with hyphens")
    @Size(max = 255, message = "Slug must not exceed 255 characters")
    private String slug;

    @NotBlank(message = "Description is required")
    private String description;

    @Size(max = 500, message = "Short description must not exceed 500 characters")
    private String shortDescription;

    @NotNull(message = "Category is required")
    private Long categoryId;

    @NotNull(message = "Price is required")
    @DecimalMin(value = "0.0", message = "Price must be positive")
    private BigDecimal price;

    @DecimalMin(value = "0.0", message = "Discount price must be positive")
    private BigDecimal discountPrice;

    @Pattern(regexp = "^[A-Z]{3}$", message = "Currency must be 3-letter ISO code (e.g., USD)")
    private String currency = "USD";

    private String thumbnailUrl;
    private String previewVideoUrl;

    @NotNull(message = "Level is required")
    private CourseLevel level;

    private String language = "en";

    @Min(value = 0, message = "Duration must be positive")
    private Integer durationHours;

    private Boolean hasCertificate = false;
    private Boolean hasSubtitles = false;

    private String metaTitle;
    private String metaDescription;
    private String metaKeywords;
}
