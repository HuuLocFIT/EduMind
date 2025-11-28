package com.edumind.lms.modules.course.dto.request;

import jakarta.validation.constraints.NotEmpty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReorderLessonsRequest {
    @NotEmpty(message = "Lesson IDs are required")
    private List<Long> lessonIds;
}
