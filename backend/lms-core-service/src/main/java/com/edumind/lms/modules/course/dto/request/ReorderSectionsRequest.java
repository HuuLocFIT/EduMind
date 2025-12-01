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
public class ReorderSectionsRequest {
    @NotEmpty(message = "Section IDs are required")
    private List<Long> sectionIds;
}
