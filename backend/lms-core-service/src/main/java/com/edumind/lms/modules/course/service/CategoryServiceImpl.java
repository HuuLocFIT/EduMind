package com.edumind.lms.modules.course.service;

import com.edumind.lms.modules.course.entity.Category;
import com.edumind.lms.modules.course.event.CategoryCreatedEvent;
import com.edumind.lms.modules.course.event.CategoryDeletedEvent;
import com.edumind.lms.modules.course.event.CategoryStatusChangedEvent;
import com.edumind.lms.modules.course.event.CategoryUpdatedEvent;
import com.edumind.lms.modules.course.exception.CategoryAlreadyExistsException;
import com.edumind.lms.modules.course.exception.CategoryNotFoundException;
import com.edumind.lms.modules.course.repository.CategoryRepository;
import com.edumind.lms.shared.exception.BadRequestException;
import com.edumind.lms.shared.exception.ConflictException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CategoryServiceImpl implements CategoryService {
    private final CategoryRepository categoryRepository;
    private final ApplicationEventPublisher eventPublisher;

    @Override
    @Transactional
    public Category createCategory(Category category) {
        log.info("Creating category: {}", category.getName());

        // Check if name exists
        if (categoryRepository.existsByName(category.getName())) {
            throw new CategoryAlreadyExistsException(category.getName());
        }

        // Check if slug exists
        if (categoryRepository.existsBySlug(category.getSlug())) {
            throw new ConflictException("Category with slug '" + category.getSlug() + "' already exists");
        }

        // Set active by default
        if (category.getIsActive() == null) {
            category.setIsActive(true);
        }

        Category savedCategory = categoryRepository.save(category);

        eventPublisher.publishEvent(new CategoryCreatedEvent(this, savedCategory.getId(), savedCategory.getName()));

        log.info("Category created successfully: {}", savedCategory.getId());
        return savedCategory;
    }

    @Override
    @Transactional
    public Category updateCategory(Long categoryId, Category categoryUpdate) {
        log.info("Updating category: {}", categoryId);

        Category existingCategory = getCategoryById(categoryId);

        // Check name uniqueness if changed
        if (!existingCategory.getName().equals(categoryUpdate.getName())) {
            if (categoryRepository.existsByName(categoryUpdate.getName())) {
                throw new CategoryAlreadyExistsException(categoryUpdate.getName());
            }
        }

        // Check slug uniqueness if changed
        if (!existingCategory.getSlug().equals(categoryUpdate.getSlug())) {
            if (categoryRepository.existsBySlug(categoryUpdate.getSlug())) {
                throw new ConflictException("Category with slug '" + categoryUpdate.getSlug() + "' already exists");
            }
        }

        // Update fields
        existingCategory.setName(categoryUpdate.getName());
        existingCategory.setSlug(categoryUpdate.getSlug());
        existingCategory.setDescription(categoryUpdate.getDescription());
        existingCategory.setIconUrl(categoryUpdate.getIconUrl());

        Category updatedCategory = categoryRepository.save(existingCategory);

        eventPublisher.publishEvent(new CategoryUpdatedEvent(this, categoryId, updatedCategory.getName()));

        log.info("Category updated successfully: {}", categoryId);
        return updatedCategory;
    }

    @Override
    @Transactional
    public void deleteCategory(Long categoryId) {
        log.info("Deleting category: {}", categoryId);

        Category category = getCategoryById(categoryId);

        // Check if category has courses
        long courseCount = categoryRepository.countCoursesByCategory(categoryId);
        if (courseCount > 0) {
            throw new BadRequestException("Cannot delete category with existing courses");
        }

        category.setDeletedAt(LocalDateTime.now());
        categoryRepository.save(category);

        eventPublisher.publishEvent(new CategoryDeletedEvent(this, categoryId, category.getName()));

        log.info("Category deleted successfully: {}", categoryId);
    }

    @Override
    public Category getCategoryById(Long categoryId) {
        Category category = categoryRepository.findById(categoryId)
                .orElseThrow(() -> new CategoryNotFoundException(categoryId));
        if (category.getDeletedAt() != null) {
            throw new CategoryNotFoundException(categoryId);
        }
        return category;
    }

    @Override
    public Category getCategoryBySlug(String slug) {
        Category category = categoryRepository.findBySlug(slug)
                .orElseThrow(() -> new CategoryNotFoundException(slug));
        if (category.getDeletedAt() != null) {
            throw new CategoryNotFoundException(slug);
        }
        return category;
    }

    @Override
    public List<Category> getAllActiveCategories() {
        log.debug("Getting all active categories");
        return categoryRepository.findByIsActiveTrueAndDeletedAtIsNull();
    }

    @Override
    public List<Category> getAllCategories() {
        log.debug("Getting all categories");
        return categoryRepository.findByDeletedAtIsNull();
    }

    @Override
    public List<Category> getCategoriesWithPublishedCourses() {
        log.debug("Getting categories with published courses");
        return categoryRepository.findCategoriesWithPublishedCourses();
    }

    @Override
    @Transactional
    public Category toggleCategoryStatus(Long categoryId) {
        log.info("Toggling status for category: {}", categoryId);

        Category category = getCategoryById(categoryId);
        category.setIsActive(!category.getIsActive());

        Category updatedCategory = categoryRepository.save(category);

        eventPublisher.publishEvent(new CategoryStatusChangedEvent(
                this, categoryId, updatedCategory.getName(), updatedCategory.getIsActive()));

        log.info("Category status toggled: {} -> {}", categoryId, updatedCategory.getIsActive());
        return updatedCategory;
    }

    @Override
    public long getCourseCount(Long categoryId) {
        return categoryRepository.countPublishedCoursesByCategory(categoryId);
    }
}
