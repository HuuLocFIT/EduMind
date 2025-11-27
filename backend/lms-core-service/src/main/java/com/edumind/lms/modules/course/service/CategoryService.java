package com.edumind.lms.modules.course.service;

import com.edumind.lms.modules.course.entity.Category;

import java.util.List;

public interface CategoryService {
    /**
     * Create category (ADMIN only)
     */
    Category createCategory(Category category);

    /**
     * Update category (ADMIN only)
     */
    Category updateCategory(Long categoryId, Category categoryUpdate);

    /**
     * Delete category (ADMIN only)
     */
    void deleteCategory(Long categoryId);

    /**
     * Get category by ID
     */
    Category getCategoryById(Long categoryId);

    /**
     * Get category by slug
     */
    Category getCategoryBySlug(String slug);

    /**
     * List all active categories (PUBLIC)
     */
    List<Category> getAllActiveCategories();

    /**
     * List all categories (ADMIN)
     */
    List<Category> getAllCategories();

    /**
     * Get categories with published courses (PUBLIC)
     */
    List<Category> getCategoriesWithPublishedCourses();

    /**
     * Toggle category active status (ADMIN)
     */
    Category toggleCategoryStatus(Long categoryId);

    /**
     * Get course count for category
     */
    long getCourseCount(Long categoryId);
}
