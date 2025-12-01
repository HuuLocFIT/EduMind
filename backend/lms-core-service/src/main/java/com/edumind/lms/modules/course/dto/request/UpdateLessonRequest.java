package com.edumind.lms.modules.course.dto.request;

import com.edumind.lms.modules.course.entity.LessonResource;
import com.edumind.lms.modules.course.enums.ContentType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateLessonRequest {
    @NotBlank(message = "Lesson title is required")
    @Size(max = 255, message = "Lesson title must not exceed 255 characters")
    private String title;

    @Size(max = 2000, message = "Lesson description must not exceed 2000 characters")
    private String description;

    private ContentType contentType;

    // For VIDEO content
    private String videoUrl;

    @PositiveOrZero(message = "Video duration must be non-negative")
    private Integer videoDuration; // seconds

    // For ARTICLE content
    private String articleContent;

    // Resources (PDFs, links, etc.)
    private List<LessonResource> resources;

    private Boolean isPreview;
    private Boolean isMandatory;
}
