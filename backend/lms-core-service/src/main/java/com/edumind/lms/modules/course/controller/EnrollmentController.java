package com.edumind.lms.modules.course.controller;

import com.edumind.common.response.ApiResponse;
import com.edumind.common.response.PagedResponse;
import com.edumind.lms.modules.course.dto.request.EnrollRequest;
import com.edumind.lms.modules.course.dto.response.EnrollmentResponse;
import com.edumind.lms.modules.course.entity.Enrollment;
import com.edumind.lms.modules.course.enums.EnrollmentStatus;
import com.edumind.lms.modules.course.service.EnrollmentService;
import com.edumind.lms.modules.course.util.EnrollmentMapper;
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
    public ResponseEntity<ApiResponse<EnrollmentResponse>> getEnrollmentById(@PathVariable Long id) {
        log.info("Getting enrollment: {}", id);

        Enrollment enrollment = enrollmentService.getEnrollmentById(id);
        EnrollmentResponse response = enrollmentMapper.toResponse(enrollment);

        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/my-enrollments")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<PagedResponse<EnrollmentResponse>> getMyEnrollments(
            @RequestParam(required = false) EnrollmentStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
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
                responsePage.getTotalPages()
        ));
    }

    @GetMapping("/student/{studentId}")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN')")
    public ResponseEntity<PagedResponse<EnrollmentResponse>> getStudentEnrollments(
            @PathVariable Long studentId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {

        log.info("Getting enrollments for student: {}", studentId);

        Pageable pageable = PageRequest.of(page, size, Sort.by("enrolledAt").descending());
        Page<Enrollment> enrollmentPage = enrollmentService.getStudentEnrollments(studentId, pageable);
        Page<EnrollmentResponse> responsePage = enrollmentPage.map(enrollmentMapper::toResponse);

        return ResponseEntity.ok(PagedResponse.of(
                responsePage.getContent(),
                responsePage.getNumber(),
                responsePage.getSize(),
                responsePage.getTotalElements(),
                responsePage.getTotalPages()
        ));
    }

    @GetMapping("/courses/{courseId}")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN')")
    public ResponseEntity<PagedResponse<EnrollmentResponse>> getCourseEnrollments(
            @PathVariable Long courseId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {

        log.info("Getting enrollments for course: {}", courseId);

        Pageable pageable = PageRequest.of(page, size, Sort.by("enrolledAt").descending());
        Page<Enrollment> enrollmentPage = enrollmentService.getCourseEnrollments(courseId, pageable);
        Page<EnrollmentResponse> responsePage = enrollmentPage.map(enrollmentMapper::toResponse);

        return ResponseEntity.ok(PagedResponse.of(
                responsePage.getContent(),
                responsePage.getNumber(),
                responsePage.getSize(),
                responsePage.getTotalElements(),
                responsePage.getTotalPages()
        ));
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
}
