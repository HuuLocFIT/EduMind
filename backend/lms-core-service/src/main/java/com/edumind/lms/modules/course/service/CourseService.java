package com.edumind.lms.modules.course.service;

import com.edumind.lms.modules.course.dto.response.InstructorStatsResponse;
import com.edumind.lms.modules.course.entity.Course;
import com.edumind.lms.modules.course.enums.CourseLevel;
import com.edumind.lms.modules.course.enums.CourseStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.math.BigDecimal;

public interface CourseService {
    /**
     * Create a new course (TEACHER only)
     */
    Course createCourse(Course course, Long instructorId);

    /**
     * Update course (TEACHER - own courses only)
     */
    Course updateCourse(Long courseId, Course courseUpdate, Long instructorId);

    /**
     * Publish course (TEACHER)
     */
    Course publishCourse(Long courseId, Long instructorId);

    /**
     * Archive course (TEACHER/ADMIN)
     */
    Course archiveCourse(Long courseId, Long userId, String userRole);

    /**
     * Delete course (TEACHER - own courses, ADMIN - any)
     */
    void deleteCourse(Long courseId, Long userId, String userRole);

    /**
     * Get course by ID (PUBLIC for published, TEACHER for own drafts)
     */
    Course getCourseById(Long courseId);

    /**
     * Get course by slug (PUBLIC for published)
     */
    Course getCourseBySlug(String slug);

    /**
     * Get courses by instructor
     */
    Page<Course> getCoursesByInstructor(Long instructorId, Pageable pageable);

    /**
     * Get instructor's courses by status
     */
    Page<Course> getInstructorCoursesByStatus(Long instructorId, CourseStatus status, Pageable pageable);

    /**
     * Search published courses (PUBLIC)
     */
    Page<Course> searchPublishedCourses(String keyword, Pageable pageable);

    /**
     * Get published courses by category
     */
    Page<Course> getPublishedCoursesByCategory(Long categoryId, Pageable pageable);

    /**
     * Get courses with filters (PUBLIC - only published)
     */
    Page<Course> getCoursesWithFilters(
            Long categoryId,
            CourseLevel level,
            BigDecimal minPrice,
            BigDecimal maxPrice,
            String keyword,
            Pageable pageable
    );

    /**
     * Get top-rated courses
     */
    Page<Course> getTopRatedCourses(Pageable pageable);

    /**
     * Get most popular courses
     */
    Page<Course> getMostPopularCourses(Pageable pageable);

    /**
     * Get newest courses
     */
    Page<Course> getNewestCourses(Pageable pageable);

    /**
     * Get free courses
     */
    Page<Course> getFreeCourses(Pageable pageable);

    /**
     * Check if user can access course
     */
    boolean canAccessCourse(Long courseId, Long userId);

    /**
     * Validate course ownership
     */
    void validateCourseOwnership(Long courseId, Long instructorId);

    /**
     * Update course statistics (internal use)
     */
    void updateCourseStatistics(Long courseId);

    InstructorStatsResponse getInstructorStats(Long instructorId);
}