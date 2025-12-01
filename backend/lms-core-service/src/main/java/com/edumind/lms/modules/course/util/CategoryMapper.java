package com.edumind.lms.modules.course.util;

import com.edumind.lms.modules.course.dto.request.CreateCategoryRequest;
import com.edumind.lms.modules.course.dto.request.UpdateCategoryRequest;
import com.edumind.lms.modules.course.dto.response.CategoryResponse;
import com.edumind.lms.modules.course.entity.Category;
import org.springframework.stereotype.Component;

@Component
public class CategoryMapper {
    public Category toEntity(CreateCategoryRequest request) {
        return Category.builder()
                .name(request.getName())
                .slug(request.getSlug())
                .description(request.getDescription())
                .iconUrl(request.getIconUrl())
                .isActive(true)
                .build();
    }

    public Category updateEntity(Category category, UpdateCategoryRequest request) {
        if (request.getName() != null) category.setName(request.getName());
        if (request.getSlug() != null) category.setSlug(request.getSlug());
        if (request.getDescription() != null) category.setDescription(request.getDescription());
        if (request.getIconUrl() != null) category.setIconUrl(request.getIconUrl());

        return category;
    }

    public CategoryResponse toResponse(Category category) {
        return CategoryResponse.builder()
                .id(category.getId())
                .name(category.getName())
                .slug(category.getSlug())
                .description(category.getDescription())
                .iconUrl(category.getIconUrl())
                .isActive(category.getIsActive())
                .createdAt(category.getCreatedAt())
                .updatedAt(category.getUpdatedAt())
                .build();
    }

    public CategoryResponse toResponseWithCount(Category category, long courseCount) {
        CategoryResponse response = toResponse(category);
        response.setCourseCount(courseCount);
        return response;
    }
}
