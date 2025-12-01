package com.edumind.lms.modules.course.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SectionResponse {
    private Long id;
    private Long courseId;
    private String title;
    private String description;
    private Integer orderIndex;
    private Integer lessonCount;
    private Integer totalDurationMinutes;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
