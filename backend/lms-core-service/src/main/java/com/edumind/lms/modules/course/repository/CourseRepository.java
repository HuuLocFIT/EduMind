package com.edumind.lms.modules.course.repository;

import com.edumind.lms.modules.course.entity.Course;
import com.edumind.lms.modules.course.enums.CourseLevel;
import com.edumind.lms.modules.course.enums.CourseStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.Optional;

@Repository
public interface CourseRepository extends JpaRepository<Course, Long> {
    /**
     * Find course by ID with category fetched (no pagination - use JOIN FETCH)
     */
    @Query("SELECT DISTINCT c FROM Course c JOIN FETCH c.category WHERE c.id = :id")
    Optional<Course> findByIdWithCategory(@Param("id") Long id);

    /**
     * Find course by slug (for SEO-friendly URLs) - no pagination, use JOIN FETCH
     */
    @Query("SELECT DISTINCT c FROM Course c JOIN FETCH c.category WHERE c.slug = :slug")
    Optional<Course> findBySlug(@Param("slug") String slug);

    /**
     * Check if slug exists (for validation)
     */
    boolean existsBySlug(String slug);

    /**
     * Find all published courses
     */
    Page<Course> findByStatus(CourseStatus status, Pageable pageable);

    /**
     * Find courses by instructor (with category fetched) - with pagination, use @EntityGraph
     */
    @EntityGraph("Course.withCategory")
    Page<Course> findByInstructorId(Long instructorId, Pageable pageable);

    /**
     * Find courses by instructor and status
     */
    Page<Course> findByInstructorIdAndStatus(Long instructorId, CourseStatus status, Pageable pageable);

    /**
     * Find courses by category
     */
    Page<Course> findByCategoryId(Long categoryId, Pageable pageable);

    /**
     * Find published courses by category - with pagination, use @EntityGraph
     */
    @EntityGraph("Course.withCategory")
    @Query("SELECT c FROM Course c WHERE c.category.id = :categoryId AND c.status = 'PUBLISHED'")
    Page<Course> findPublishedCoursesByCategory(@Param("categoryId") Long categoryId, Pageable pageable);

    /**
     * Search courses by title or description
     */
    @Query("SELECT c FROM Course c WHERE " +
            "LOWER(c.title) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
            "LOWER(c.description) LIKE LOWER(CONCAT('%', :keyword, '%'))")
    Page<Course> searchCourses(@Param("keyword") String keyword, Pageable pageable);

    /**
     * Search published courses only - with pagination, use @EntityGraph
     */
    @EntityGraph("Course.withCategory")
    @Query("SELECT c FROM Course c WHERE c.status = 'PUBLISHED' AND " +
            "(LOWER(c.title) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
            "LOWER(c.description) LIKE LOWER(CONCAT('%', :keyword, '%')))")
    Page<Course> searchPublishedCourses(@Param("keyword") String keyword, Pageable pageable);

    /**
     * Find courses by level
     */
    Page<Course> findByLevelAndStatus(CourseLevel level, CourseStatus status, Pageable pageable);

    /**
     * Find courses by price range
     */
    @Query("SELECT c FROM Course c WHERE c.status = 'PUBLISHED' AND " +
            "c.price BETWEEN :minPrice AND :maxPrice")
    Page<Course> findByPriceRange(
            @Param("minPrice") BigDecimal minPrice,
            @Param("maxPrice") BigDecimal maxPrice,
            Pageable pageable
    );

    /**
     * Find free courses (price = 0) - with pagination, use @EntityGraph
     */
    @EntityGraph("Course.withCategory")
    @Query("SELECT c FROM Course c WHERE c.status = 'PUBLISHED' AND c.price = 0")
    Page<Course> findFreeCourses(Pageable pageable);

    /**
     * Find top-rated courses - with pagination, use @EntityGraph
     */
    @EntityGraph("Course.withCategory")
    @Query("SELECT c FROM Course c WHERE c.status = 'PUBLISHED' " +
            "ORDER BY c.averageRating DESC, c.totalReviews DESC")
    Page<Course> findTopRatedCourses(Pageable pageable);

    /**
     * Find most popular courses (by enrollment count) - with pagination, use @EntityGraph
     */
    @EntityGraph("Course.withCategory")
    @Query("SELECT c FROM Course c WHERE c.status = 'PUBLISHED' " +
            "ORDER BY c.totalStudents DESC")
    Page<Course> findMostPopularCourses(Pageable pageable);

    /**
     * Find newest courses - with pagination, use @EntityGraph
     */
    @EntityGraph("Course.withCategory")
    @Query("SELECT c FROM Course c WHERE c.status = 'PUBLISHED' " +
            "ORDER BY c.publishedAt DESC")
    Page<Course> findNewestCourses(Pageable pageable);

    /**
     * Complex filter query - with pagination, use @EntityGraph
     * Using string concatenation with || operator to avoid type casting issues
     */
    @EntityGraph("Course.withCategory")
    @Query("SELECT c FROM Course c WHERE c.status = 'PUBLISHED' " +
            "AND (:categoryId IS NULL OR c.category.id = :categoryId) " +
            "AND (:level IS NULL OR c.level = :level) " +
            "AND (:minPrice IS NULL OR c.price >= :minPrice) " +
            "AND (:maxPrice IS NULL OR c.price <= :maxPrice) " +
            "AND (:keyword IS NULL OR :keyword = '' OR LOWER(c.title) LIKE '%' || LOWER(:keyword) || '%')")
    Page<Course> findCoursesWithFilters(
            @Param("categoryId") Long categoryId,
            @Param("level") CourseLevel level,
            @Param("minPrice") BigDecimal minPrice,
            @Param("maxPrice") BigDecimal maxPrice,
            @Param("keyword") String keyword,
            Pageable pageable
    );

    /**
     * Count courses by instructor
     */
    long countByInstructorId(Long instructorId);

    /**
     * Count published courses by instructor
     */
    long countByInstructorIdAndStatus(Long instructorId, CourseStatus status);

    /**
     * Get total students enrolled in instructor's courses
     */
    @Query("SELECT SUM(c.totalStudents) FROM Course c WHERE c.instructorId = :instructorId")
    Long getTotalStudentsByInstructor(@Param("instructorId") Long instructorId);
}
