package com.edumind.lms.modules.course.service;

import com.edumind.lms.modules.course.dto.response.EnrollmentReportResponse;
import com.edumind.lms.modules.course.dto.response.EnrollmentReportStatsResponse;
import com.edumind.lms.modules.course.dto.response.EnrollmentStatsResponse;
import com.edumind.lms.modules.course.entity.Enrollment;
import com.edumind.lms.modules.course.enums.EnrollmentStatus;
import com.edumind.lms.modules.course.enums.ReportRequestStatus;
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

    /**
     * Suspend an enrollment (e.g. teacher/admin temporarily disables access)
     * 
     * @param enrollmentId The enrollment ID
     * @param reason       The reason for suspension (required for audit/logging)
     */
    void suspendEnrollment(Long enrollmentId, String reason);

    /**
     * Reactivate a previously suspended enrollment
     */
    void activateEnrollment(Long enrollmentId);

    /**
     * Unenroll a student from a course (teacher/admin only)
     */
    void unenrollStudent(Long enrollmentId);

    /**
     * Report enrollment to admin for unenrollment (for paid courses)
     * Teacher cannot directly unenroll students from paid courses, must request admin
     * 
     * @param enrollmentId The enrollment ID
     * @param teacherId The teacher ID making the request
     * @param reason The reason for requesting unenrollment
     */
    void reportToAdmin(Long enrollmentId, Long teacherId, String reason);

    /**
     * Drop (soft-revoke) a student's enrollment, identified by course and student IDs.
     * Used by the payment module's ACL layer for refund-driven revocations.
     * Does NOT decrement totalStudents — the student genuinely enrolled and paid.
     * Idempotency: safe to call multiple times (no-op if already DROPPED or not found).
     *
     * @param courseId  the course whose enrollment is being revoked
     * @param studentId the student being dropped
     */
    void dropStudent(Long courseId, Long studentId);

    /**
     * Get enrollment reports for admin review (ADMIN only)
     * 
     * @param status The status filter (null for all statuses)
     * @param pageable Pagination parameters
     * @return Page of enrollment report responses
     */
    Page<EnrollmentReportResponse> getAdminReports(ReportRequestStatus status, Pageable pageable);

    /**
     * Approve an enrollment report request (ADMIN only)
     * This will unenroll the student and mark the report as APPROVED
     * 
     * @param reportId The report ID
     * @param adminId The admin ID approving the report
     * @param adminNotes Optional admin notes
     */
    void approveReport(Long reportId, Long adminId, String adminNotes);

    /**
     * Reject an enrollment report request (ADMIN only)
     *
     * @param reportId The report ID
     * @param adminId The admin ID rejecting the report
     * @param adminNotes Required admin notes explaining the rejection
     */
    void rejectReport(Long reportId, Long adminId, String adminNotes);

    /**
     * Get counts of enrollment reports grouped by status (ADMIN only)
     */
    EnrollmentReportStatsResponse getReportStats();
}