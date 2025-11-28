package com.edumind.lms.modules.course.dto.response;

import com.edumind.lms.modules.course.entity.LessonResource;
import com.edumind.lms.modules.course.enums.ContentType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LessonResponse {
    private Long id;
    private Long sectionId;
    private Long courseId;
    private String title;
    private String description;
    private ContentType contentType;

    // For VIDEO content
    private String videoUrl;
    private Integer videoDuration; // seconds

    // For ARTICLE content
    private String articleContent;

    // Resources
    private List<LessonResource> resources;

    private Integer orderIndex;
    private Boolean isPreview;
    private Boolean isMandatory;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
