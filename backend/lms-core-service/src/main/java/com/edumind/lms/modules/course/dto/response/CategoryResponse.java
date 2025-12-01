package com.edumind.lms.modules.course.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class CategoryResponse {
    private Long id;
    private String name;
    private String slug;
    private String description;
    private String iconUrl;
    private Boolean isActive;
    private Long courseCount;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
