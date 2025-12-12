package com.edumind.lms.modules.course.service;

import com.edumind.lms.modules.course.dto.response.EnrollmentStatsResponse;
import com.edumind.lms.modules.course.entity.Enrollment;
import com.edumind.lms.modules.course.enums.EnrollmentStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface EnrollmentService {
    /**
     * Enroll student in course (STUDENT only)
     */
    Enrollment enrollStudent(Long courseId, Long studentId);

    /**
     * Get enrollment by ID
     */
    Enrollment getEnrollmentById(Long enrollmentId);

    /**
     * Get enrollment by course and student
     */
    Enrollment getEnrollmentByCourseAndStudent(Long courseId, Long studentId);

    /**
     * Get student's enrollments
     */
    Page<Enrollment> getStudentEnrollments(Long studentId, Pageable pageable);

    /**
     * Get student's enrollments by status
     */
    Page<Enrollment> getStudentEnrollmentsByStatus(Long studentId, EnrollmentStatus status, Pageable pageable);

    /**
     * Get course enrollments (TEACHER/ADMIN)
     */
    Page<Enrollment> getCourseEnrollments(Long courseId, Pageable pageable);

    /**
     * Update enrollment progress
     */
    Enrollment updateEnrollmentProgress(Long enrollmentId);

    /**
     * Complete course (triggered when all mandatory lessons completed)
     */
    Enrollment completeCourse(Long enrollmentId);

    /**
     * Update last accessed time
     */
    void updateLastAccessed(Long enrollmentId);

    /**
     * Check if student is enrolled
     */
    boolean isStudentEnrolled(Long courseId, Long studentId);

    /**
     * Get student's in-progress courses
     */
    List<Enrollment> getInProgressCourses(Long studentId, Integer minProgress);

    /**
     * Get student's completed courses
     */
    List<Enrollment> getCompletedCourses(Long studentId);

    /**
     * Get recently accessed courses
     */
    List<Enrollment> getRecentlyAccessedCourses(Long studentId, int limit);

    /**
     * Get enrollment statistics for student
     */
    EnrollmentStatsResponse getEnrollmentStats(Long studentId);
}