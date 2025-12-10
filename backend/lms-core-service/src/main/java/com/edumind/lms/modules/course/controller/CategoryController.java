package com.edumind.lms.modules.course.controller;

import com.edumind.common.response.ApiResponse;
import com.edumind.lms.modules.course.dto.request.CreateCategoryRequest;
import com.edumind.lms.modules.course.dto.request.UpdateCategoryRequest;
import com.edumind.lms.modules.course.dto.response.CategoryResponse;
import com.edumind.lms.modules.course.entity.Category;
import com.edumind.lms.modules.course.service.CategoryService;
import com.edumind.lms.modules.course.util.CategoryMapper;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@RestController
@RequestMapping("/categories")
@RequiredArgsConstructor
public class CategoryController {
    private final CategoryService categoryService;
    private final CategoryMapper categoryMapper;

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<CategoryResponse>> createCategory(
            @Valid @RequestBody CreateCategoryRequest request) {

        log.info("Creating category: {}", request.getName());

        Category category = categoryMapper.toEntity(request);
        Category created = categoryService.createCategory(category);
        CategoryResponse response = categoryMapper.toResponse(created);

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(ApiResponse.success("Category created successfully", response));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<CategoryResponse>> updateCategory(
            @PathVariable Long id,
            @Valid @RequestBody UpdateCategoryRequest request) {

        log.info("Updating category: {}", id);

        Category existingCategory = categoryService.getCategoryById(id);
        Category updatedCategory = categoryMapper.updateEntity(existingCategory, request);
        Category saved = categoryService.updateCategory(id, updatedCategory);
        CategoryResponse response = categoryMapper.toResponse(saved);

        return ResponseEntity.ok(ApiResponse.success("Category updated successfully", response));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> deleteCategory(@PathVariable Long id) {
        log.info("Deleting category: {}", id);

        categoryService.deleteCategory(id);

        return ResponseEntity.ok(ApiResponse.success("Category deleted successfully", null));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<CategoryResponse>> getCategoryById(@PathVariable Long id) {
        log.info("Getting category: {}", id);

        Category category = categoryService.getCategoryById(id);
        long courseCount = categoryService.getCourseCount(id);
        CategoryResponse response = categoryMapper.toResponseWithCount(category, courseCount);

        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<CategoryResponse>>> getAllActiveCategories() {
        log.info("Getting all active categories");

        List<Category> categories = categoryService.getAllActiveCategories();
        List<CategoryResponse> responses = categories.stream()
                .map(cat -> {
                    long count = categoryService.getCourseCount(cat.getId());
                    return categoryMapper.toResponseWithCount(cat, count);
                })
                .collect(Collectors.toList());

        return ResponseEntity.ok(ApiResponse.success(responses));
    }

    @GetMapping("/all")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<List<CategoryResponse>>> getAllCategories() {
        log.info("Getting all categories");

        List<Category> categories = categoryService.getAllCategories();
        List<CategoryResponse> responses = categories.stream()
                .map(cat -> {
                    long count = categoryService.getCourseCount(cat.getId());
                    return categoryMapper.toResponseWithCount(cat, count);
                })
                .collect(Collectors.toList());

        return ResponseEntity.ok(ApiResponse.success(responses));
    }

    @GetMapping("/with-courses")
    public ResponseEntity<ApiResponse<List<CategoryResponse>>> getCategoriesWithCourses() {
        log.info("Getting categories with published courses");

        List<Category> categories = categoryService.getCategoriesWithPublishedCourses();
        List<CategoryResponse> responses = categories.stream()
                .map(cat -> {
                    long count = categoryService.getCourseCount(cat.getId());
                    return categoryMapper.toResponseWithCount(cat, count);
                })
                .collect(Collectors.toList());

        return ResponseEntity.ok(ApiResponse.success(responses));
    }

    @PatchMapping("/{id}/toggle-status")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<CategoryResponse>> toggleCategoryStatus(@PathVariable Long id) {
        log.info("Toggling status for category: {}", id);

        Category category = categoryService.toggleCategoryStatus(id);
        CategoryResponse response = categoryMapper.toResponse(category);

        return ResponseEntity.ok(ApiResponse.success("Category status updated", response));
    }
}
