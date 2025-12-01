package com.edumind.lms.modules.course.repository;

import com.edumind.lms.modules.course.entity.Category;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CategoryRepository extends JpaRepository<Category, Long> {
    /**
     * Find category by slug
     */
    Optional<Category> findBySlug(String slug);

    /**
     * Check if slug exists
     */
    boolean existsBySlug(String slug);

    /**
     * Check if name exists
     */
    boolean existsByName(String name);

    /**
     * Find all active categories
     */
    List<Category> findByIsActiveTrue();

    /**
     * Find categories with published courses
     */
    @Query("SELECT DISTINCT c FROM Category c " +
            "JOIN c.courses co WHERE co.status = 'PUBLISHED'")
    List<Category> findCategoriesWithPublishedCourses();

    /**
     * Count courses in category
     */
    @Query("SELECT COUNT(c) FROM Course c WHERE c.category.id = :categoryId")
    long countCoursesByCategory(Long categoryId);

    /**
     * Count published courses in category
     */
    @Query("SELECT COUNT(c) FROM Course c WHERE c.category.id = :categoryId AND c.status = 'PUBLISHED'")
    long countPublishedCoursesByCategory(Long categoryId);
}