package com.edumind.lms.modules.course.controller;

import com.edumind.common.response.ApiResponse;
import com.edumind.lms.modules.course.dto.response.CertificateVerificationResponse;
import com.edumind.lms.modules.course.dto.response.UserPublicProfileResponse;
import com.edumind.lms.modules.course.entity.Enrollment;
import com.edumind.lms.modules.course.enums.EnrollmentStatus;
import com.edumind.lms.modules.course.repository.EnrollmentRepository;
import com.edumind.lms.modules.course.service.CertificateServiceImpl;
import com.edumind.lms.modules.course.service.EnrollmentService;
import com.edumind.lms.shared.client.UserClient;
import com.edumind.lms.shared.exception.BadRequestException;
import com.edumind.lms.shared.exception.ResourceNotFoundException;
import com.edumind.lms.shared.exception.UnauthorizedException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Slf4j
@RestController
@RequestMapping("/certificates")
@RequiredArgsConstructor
public class CertificateController {

    private final EnrollmentService enrollmentService;
    private final CertificateServiceImpl certificateService;
    private final EnrollmentRepository enrollmentRepository;
    private final UserClient userClient;

    /**
     * Regenerate a certificate for a completed enrollment.
     * Validates authorization + preconditions synchronously, then delegates
     * the actual regeneration (Cloudinary + PDF generation) to an async method.
     */
    @PostMapping("/{enrollmentId}/regenerate")
    @PreAuthorize("hasAnyRole('STUDENT', 'TEACHER', 'ADMIN')")
    public ResponseEntity<ApiResponse<Void>> regenerateCertificate(
            @PathVariable Long enrollmentId,
            Authentication authentication) {

        Long userId = Long.valueOf(authentication.getPrincipal().toString());
        Enrollment enrollment = enrollmentService.getEnrollmentById(enrollmentId);

        // Authorization: only owning student OR course instructor OR admin
        boolean isAdmin = authentication.getAuthorities().stream()
                .anyMatch(authority -> "ROLE_ADMIN".equals(authority.getAuthority()));
        if (!isAdmin
                && !enrollment.getStudentId().equals(userId)
                && !enrollment.getCourse().getInstructorId().equals(userId)) {
            throw new UnauthorizedException("Not authorized to regenerate this certificate");
        }

        // Check: enrollment must be COMPLETED and course has certificate enabled
        if (enrollment.getStatus() != EnrollmentStatus.COMPLETED) {
            throw new BadRequestException("Enrollment is not completed");
        }
        if (!Boolean.TRUE.equals(enrollment.getCourse().getHasCertificate())) {
            throw new BadRequestException("Course does not offer certificates");
        }
        if (!enrollment.getCourse().isPaid()) {
            throw new BadRequestException("Course is not a paid course, certificates are only available for paid courses");
        }

        // Delegate all clearance + generation to async service
        certificateService.regenerateCertificate(enrollmentId);

        return ResponseEntity.ok(ApiResponse.success("Certificate regeneration initiated", null));
    }

    /**
     * Verify a certificate by its UUID reference (public, no auth required).
     * Returns redacted student info (first name + last initial, GDPR-compliant).
     */
    @GetMapping("/verify/{reference}")
    public ResponseEntity<ApiResponse<CertificateVerificationResponse>> verifyCertificate(
            @PathVariable String reference) {

        Enrollment enrollment = enrollmentRepository.findByCertificateReference(reference)
                .orElseThrow(() -> new ResourceNotFoundException("Certificate not found with reference: " + reference));

        // GDPR consideration: only show first name + last initial publicly
        String studentNameRedacted = resolveRedactedStudentName(enrollment.getStudentId());

        CertificateVerificationResponse response = CertificateVerificationResponse.builder()
                .courseTitle(enrollment.getCourse().getTitle())
                .studentName(studentNameRedacted)
                .instructorName(enrollment.getCourse().getInstructorName())
                .completionDate(enrollment.getCompletedAt())
                .certificateIssuedAt(enrollment.getCertificateIssuedAt())
                .isValid(enrollment.getStatus() == EnrollmentStatus.COMPLETED
                        && enrollment.getCertificateUrl() != null)
                .build();

        return ResponseEntity.ok(ApiResponse.success(response));
    }

    /**
     * Download certificate — redirects to the Cloudinary PDF URL.
     */
    @GetMapping("/{enrollmentId}/download")
    @PreAuthorize("hasAnyRole('STUDENT', 'TEACHER', 'ADMIN')")
    public ResponseEntity<?> downloadCertificate(
            @PathVariable Long enrollmentId,
            Authentication authentication) {

        Long userId = Long.valueOf(authentication.getPrincipal().toString());
        Enrollment enrollment = enrollmentService.getEnrollmentById(enrollmentId);

        // Authorization: only owning student or course instructor or admin
        boolean isAdmin = authentication.getAuthorities().stream()
                .anyMatch(authority -> "ROLE_ADMIN".equals(authority.getAuthority()));
        if (!isAdmin
                && !enrollment.getStudentId().equals(userId)
                && !enrollment.getCourse().getInstructorId().equals(userId)) {
            throw new UnauthorizedException("Not authorized to download this certificate");
        }

        if (enrollment.getCertificateUrl() == null) {
            throw new ResourceNotFoundException("Certificate not yet generated for this enrollment");
        }

        // Redirect to Cloudinary URL
        return ResponseEntity.status(HttpStatus.FOUND)
                .header(HttpHeaders.LOCATION, enrollment.getCertificateUrl())
                .build();
    }

    /**
     * Resolves the student's name with GDPR-compliant redaction (first name + last initial).
     */
    private String resolveRedactedStudentName(Long studentId) {
        try {
            ApiResponse<UserPublicProfileResponse> response = userClient.getUserPublicProfile(studentId);
            if (response != null && response.getData() != null) {
                String firstName = response.getData().getFirstName();
                String lastName = response.getData().getLastName();
                String lastInitial = (lastName != null && !lastName.isEmpty())
                        ? lastName.charAt(0) + "."
                        : "";
                String result = (firstName != null ? firstName : "") + " " + lastInitial;
                return result.trim().isEmpty() ? "Student" : result.trim();
            }
        } catch (Exception e) {
            log.warn("Failed to fetch student profile for id {}, using fallback", studentId, e);
        }
        return "Student";
    }
}
