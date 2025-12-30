package com.edumind.lms.modules.course.controller;

import com.edumind.common.response.ApiResponse;
import com.edumind.common.response.PagedResponse;
import com.edumind.lms.modules.course.dto.request.EnrollRequest;
import com.edumind.lms.modules.course.dto.request.SuspendEnrollmentRequest;
import com.edumind.lms.modules.course.dto.request.ReportToAdminRequest;
import com.edumind.lms.modules.course.dto.response.EnrollmentResponse;
import com.edumind.lms.modules.course.dto.response.EnrollmentStatsResponse;
import com.edumind.lms.modules.course.entity.Enrollment;
import com.edumind.lms.modules.course.entity.Course;
import com.edumind.lms.modules.course.enums.EnrollmentStatus;
import com.edumind.lms.modules.course.service.CourseService;
import com.edumind.lms.modules.course.service.EnrollmentService;
import com.edumind.lms.modules.course.util.EnrollmentMapper;
import com.edumind.lms.shared.exception.UnauthorizedException;
import jakarta.validation.constraints.Max;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@RestController
@RequestMapping("/enrollments")
@RequiredArgsConstructor
public class EnrollmentController {
    private final EnrollmentService enrollmentService;
    private final EnrollmentMapper enrollmentMapper;
    private final CourseService courseService;

    @PostMapping
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<ApiResponse<EnrollmentResponse>> enrollInCourse(
            @Valid @RequestBody EnrollRequest request,
            Authentication authentication) {

        log.info("Enrolling student in course: {}", request.getCourseId());

        Long studentId = Long.valueOf(authentication.getPrincipal().toString());
        Enrollment enrollment = enrollmentService.enrollStudent(request.getCourseId(), studentId);
        EnrollmentResponse response = enrollmentMapper.toResponse(enrollment);

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(ApiResponse.success("Enrolled successfully", response));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('STUDENT', 'TEACHER', 'ADMIN')")
    public ResponseEntity<ApiResponse<EnrollmentResponse>> getEnrollmentById(
            @PathVariable Long id,
            Authentication authentication) {
        log.info("Getting enrollment: {}", id);

        Enrollment enrollment = enrollmentService.getEnrollmentById(id);

        Long userId = Long.valueOf(authentication.getPrincipal().toString());
        boolean isAdmin = authentication.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .anyMatch(role -> "ROLE_ADMIN".equals(role));

        boolean isOwner = enrollment.getStudentId() != null
                && enrollment.getStudentId().equals(userId);
        boolean isInstructor = enrollment.getCourse() != null
                && enrollment.getCourse().getInstructorId() != null
                && enrollment.getCourse().getInstructorId().equals(userId);

        if (!isAdmin && !isOwner && !isInstructor) {
            throw new UnauthorizedException("You are not allowed to view this enrollment");
        }

        EnrollmentResponse response = enrollmentMapper.toResponse(enrollment);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/my-enrollments")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<PagedResponse<EnrollmentResponse>> getMyEnrollments(
            @RequestParam(required = false) EnrollmentStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") @Max(100) int size,
            Authentication authentication) {

        Long studentId = Long.valueOf(authentication.getPrincipal().toString());
        log.info("Getting enrollments for student: {}", studentId);

        Pageable pageable = PageRequest.of(page, size, Sort.by("enrolledAt").descending());

        Page<Enrollment> enrollmentPage;
        if (status != null) {
            enrollmentPage = enrollmentService.getStudentEnrollmentsByStatus(studentId, status, pageable);
        } else {
            enrollmentPage = enrollmentService.getStudentEnrollments(studentId, pageable);
        }

        Page<EnrollmentResponse> responsePage = enrollmentPage.map(enrollmentMapper::toResponse);

        return ResponseEntity.ok(PagedResponse.of(
                responsePage.getContent(),
                responsePage.getNumber(),
                responsePage.getSize(),
                responsePage.getTotalElements(),
                responsePage.getTotalPages()));
    }

    @GetMapping("/student/{studentId}")
    @PreAuthorize("@teacherSecurity.isActiveTeacherOrAdmin()")
    public ResponseEntity<PagedResponse<EnrollmentResponse>> getStudentEnrollments(
            @PathVariable Long studentId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") @Max(100) int size) {

        log.info("Getting enrollments for student: {}", studentId);

        Pageable pageable = PageRequest.of(page, size, Sort.by("enrolledAt").descending());
        Page<Enrollment> enrollmentPage = enrollmentService.getStudentEnrollments(studentId, pageable);
        Page<EnrollmentResponse> responsePage = enrollmentPage.map(enrollmentMapper::toResponse);

        return ResponseEntity.ok(PagedResponse.of(
                responsePage.getContent(),
                responsePage.getNumber(),
                responsePage.getSize(),
                responsePage.getTotalElements(),
                responsePage.getTotalPages()));
    }

    @GetMapping("/courses/{courseId}")
    @PreAuthorize("@teacherSecurity.isActiveTeacherOrAdmin()")
    public ResponseEntity<PagedResponse<EnrollmentResponse>> getCourseEnrollments(
            @PathVariable Long courseId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") @Max(100) int size,
            Authentication authentication) {

        log.info("Getting enrollments for course: {}", courseId);

        // Security: Verify course ownership for non-admin users
        Long userId = Long.valueOf(authentication.getPrincipal().toString());
        boolean isAdmin = authentication.getAuthorities().stream()
                .anyMatch(authority -> "ROLE_ADMIN".equals(authority.getAuthority()));
        
        if (!isAdmin) {
            Course course = courseService.getCourseById(courseId);
            if (!course.getInstructorId().equals(userId)) {
                throw new UnauthorizedException("You can only view enrollments for your own courses");
            }
        }

        Pageable pageable = PageRequest.of(page, size, Sort.by("enrolledAt").descending());
        Page<Enrollment> enrollmentPage = enrollmentService.getCourseEnrollments(courseId, pageable);
        Page<EnrollmentResponse> responsePage = enrollmentPage.map(enrollmentMapper::toResponse);

        return ResponseEntity.ok(PagedResponse.of(
                responsePage.getContent(),
                responsePage.getNumber(),
                responsePage.getSize(),
                responsePage.getTotalElements(),
                responsePage.getTotalPages()));
    }

    @GetMapping("/my-completed")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<ApiResponse<List<EnrollmentResponse>>> getMyCompletedCourses(
            Authentication authentication) {

        Long studentId = Long.valueOf(authentication.getPrincipal().toString());
        log.info("Getting completed courses for student: {}", studentId);

        List<Enrollment> enrollments = enrollmentService.getCompletedCourses(studentId);
        List<EnrollmentResponse> responses = enrollments.stream()
                .map(enrollmentMapper::toResponse)
                .collect(Collectors.toList());

        return ResponseEntity.ok(ApiResponse.success(responses));
    }

    @GetMapping("/my-in-progress")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<ApiResponse<List<EnrollmentResponse>>> getMyInProgressCourses(
            @RequestParam(defaultValue = "10") Integer minProgress,
            Authentication authentication) {

        Long studentId = Long.valueOf(authentication.getPrincipal().toString());
        log.info("Getting in-progress courses for student: {}", studentId);

        List<Enrollment> enrollments = enrollmentService.getInProgressCourses(studentId, minProgress);
        List<EnrollmentResponse> responses = enrollments.stream()
                .map(enrollmentMapper::toResponse)
                .collect(Collectors.toList());

        return ResponseEntity.ok(ApiResponse.success(responses));
    }

    @GetMapping("/my-recent")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<ApiResponse<List<EnrollmentResponse>>> getRecentlyAccessedCourses(
            @RequestParam(defaultValue = "5") int limit,
            Authentication authentication) {

        Long studentId = Long.valueOf(authentication.getPrincipal().toString());
        log.info("Getting recently accessed courses for student: {}", studentId);

        List<Enrollment> enrollments = enrollmentService.getRecentlyAccessedCourses(studentId, limit);
        List<EnrollmentResponse> responses = enrollments.stream()
                .map(enrollmentMapper::toResponse)
                .collect(Collectors.toList());

        return ResponseEntity.ok(ApiResponse.success(responses));
    }

    @GetMapping("/check/{courseId}")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<ApiResponse<Boolean>> checkEnrollmentStatus(
            @PathVariable Long courseId,
            Authentication authentication) {

        Long studentId = Long.valueOf(authentication.getPrincipal().toString());
        boolean isEnrolled = enrollmentService.isStudentEnrolled(courseId, studentId);

        return ResponseEntity.ok(ApiResponse.success(isEnrolled));
    }

    @GetMapping("/my-stats")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<ApiResponse<EnrollmentStatsResponse>> getMyEnrollmentStats(
            Authentication authentication) {

        Long studentId = Long.valueOf(authentication.getPrincipal().toString());
        log.info("Getting enrollment statistics for student: {}", studentId);

        EnrollmentStatsResponse stats = enrollmentService.getEnrollmentStats(studentId);

        return ResponseEntity.ok(ApiResponse.success(stats));
    }

    // =========================================================================
    // Instructor / Admin management actions
    // =========================================================================

    @PostMapping("/{id}/suspend")
    @PreAuthorize("@teacherSecurity.isActiveTeacherOrAdmin()")
    public ResponseEntity<ApiResponse<Void>> suspendEnrollment(
            @PathVariable Long id,
            @Valid @RequestBody SuspendEnrollmentRequest request,
            Authentication authentication) {
        log.info("Suspending enrollment {} with reason: {}", id, request.getReason());
        
        // Security: Verify course ownership for non-admin users
        Enrollment enrollment = enrollmentService.getEnrollmentById(id);
        validateCourseOwnership(enrollment, authentication);
        
        enrollmentService.suspendEnrollment(id, request.getReason());
        return ResponseEntity.ok(ApiResponse.success("Enrollment suspended successfully", null));
    }

    @PostMapping("/{id}/activate")
    @PreAuthorize("@teacherSecurity.isActiveTeacherOrAdmin()")
    public ResponseEntity<ApiResponse<Void>> activateEnrollment(@PathVariable Long id, Authentication authentication) {
        log.info("Activating enrollment {}", id);

        Enrollment enrollment = enrollmentService.getEnrollmentById(id);
        
        // Security: Verify course ownership for non-admin users
        validateCourseOwnership(enrollment, authentication);
        
        boolean isPaidCourse = enrollment.getCourse() != null && enrollment.getCourse().isPaid();
        boolean isAdmin = authentication.getAuthorities().stream()
                .anyMatch(authority -> "ROLE_ADMIN".equals(authority.getAuthority()));

        // Business rules:
        // - ADMIN can activate enrollments for any course (paid or free)
        // - TEACHER can only (re)activate enrollments for free courses
        if (isPaidCourse && !isAdmin) {
            log.warn("Non-admin user attempted to activate enrollment {} for paid course {}", id, enrollment.getCourse().getId());
            ApiResponse<Void> errorResponse = ApiResponse.<Void>builder()
                    .status(HttpStatus.FORBIDDEN.value())
                    .success(false)
                    .message("Cannot (re)activate enrollments for paid courses. Please contact admin.")
                    .data(null)
                    .timestamp(java.time.LocalDateTime.now())
                    .build();
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(errorResponse);
        }

        enrollmentService.activateEnrollment(id);
        return ResponseEntity.ok(ApiResponse.success("Enrollment activated successfully", null));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("@teacherSecurity.isActiveTeacherOrAdmin()")
    public ResponseEntity<ApiResponse<Void>> unenrollStudent(@PathVariable Long id, Authentication authentication) {
        log.info("Unenrolling student for enrollment {}", id);

        Enrollment enrollment = enrollmentService.getEnrollmentById(id);
        
        // Security: Verify course ownership for non-admin users
        validateCourseOwnership(enrollment, authentication);
        
        boolean isPaidCourse = enrollment.getCourse() != null && enrollment.getCourse().isPaid();
        boolean isAdmin = authentication.getAuthorities().stream()
                .anyMatch(authority -> "ROLE_ADMIN".equals(authority.getAuthority()));

        // Business rules:
        // - ADMIN can unenroll students from any course (paid or free)
        // - TEACHER can only unenroll students from free courses
        if (isPaidCourse && !isAdmin) {
            log.warn("Non-admin user attempted to unenroll student from paid course {}", enrollment.getCourse().getId());
            ApiResponse<Void> errorResponse = ApiResponse.<Void>builder()
                    .status(HttpStatus.FORBIDDEN.value())
                    .success(false)
                    .message("Cannot unenroll students from paid courses. Please contact admin.")
                    .data(null)
                    .timestamp(java.time.LocalDateTime.now())
                    .build();
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(errorResponse);
        }

        enrollmentService.unenrollStudent(id);
        return ResponseEntity.ok(ApiResponse.success("Student unenrolled successfully", null));
    }

    @PostMapping("/{id}/report-to-admin")
    @PreAuthorize("@teacherSecurity.isActiveTeacherOrAdmin()")
    public ResponseEntity<ApiResponse<Void>> reportToAdmin(
            @PathVariable Long id,
            @Valid @RequestBody ReportToAdminRequest request,
            Authentication authentication) {
        log.info("Reporting enrollment {} to admin with reason: {}", id, request.getReason());
        
        // Security: Verify course ownership for non-admin users
        Enrollment enrollment = enrollmentService.getEnrollmentById(id);
        validateCourseOwnership(enrollment, authentication);
        
        Long teacherId = Long.valueOf(authentication.getPrincipal().toString());
        enrollmentService.reportToAdmin(id, teacherId, request.getReason());
        
        return ResponseEntity.ok(ApiResponse.success("Report submitted successfully. Admin will review your request.", null));
    }
    
    // =========================================================================
    // Helper methods
    // =========================================================================
    
    /**
     * Validates that non-admin users can only manage enrollments for their own courses.
     * @throws UnauthorizedException if a non-admin user tries to access another instructor's course enrollments
     */
    private void validateCourseOwnership(Enrollment enrollment, Authentication authentication) {
        Long userId = Long.valueOf(authentication.getPrincipal().toString());
        boolean isAdmin = authentication.getAuthorities().stream()
                .anyMatch(authority -> "ROLE_ADMIN".equals(authority.getAuthority()));
        
        if (!isAdmin) {
            if (enrollment.getCourse() == null || 
                !enrollment.getCourse().getInstructorId().equals(userId)) {
                throw new UnauthorizedException("You can only manage enrollments for your own courses");
            }
        }
    }
}
