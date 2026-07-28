package com.edumind.lms.modules.course.util;

import com.edumind.lms.modules.course.dto.response.EnrollmentResponse;
import com.edumind.lms.modules.course.entity.Enrollment;
import com.edumind.lms.modules.course.enums.EnrollmentStatus;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class EnrollmentMapper {

    @Value("${app.certificate.require-paid-course:true}")
    private boolean requirePaidCourse;

    public EnrollmentResponse toResponse(Enrollment enrollment) {
        // Certificate visibility rules:
        // - ACTIVE / COMPLETED / EXPIRED: expose certificate data as stored.
        // - SUSPENDED: certificate is temporarily locked -> hide all certificate data from client.
        // - DROPPED: enrollment has been cancelled -> certificate is permanently revoked -> hide all certificate data.
        boolean canViewCertificate = enrollment.getStatus() == EnrollmentStatus.ACTIVE
                || enrollment.getStatus() == EnrollmentStatus.COMPLETED
                || enrollment.getStatus() == EnrollmentStatus.EXPIRED;
        String effectiveCertificateUrl = canViewCertificate ? enrollment.getCertificateUrl() : null;

        return EnrollmentResponse.builder()
                .id(enrollment.getId())
                .courseId(enrollment.getCourse().getId())
                .courseTitle(enrollment.getCourse().getTitle())
                .courseThumbnail(enrollment.getCourse().getThumbnailUrl())
                .coursePrice(enrollment.getCourse().getPrice())
                .courseIsPaid(enrollment.getCourse().isPaid())
                .courseSlug(enrollment.getCourse().getSlug())
                .studentId(enrollment.getStudentId())
                .progressPercentage(enrollment.getProgressPercentage())
                .completedLessons(enrollment.getCompletedLessons())
                .totalLessons(enrollment.getTotalLessons())
                .status(enrollment.getStatus())
                .completedAt(enrollment.getCompletedAt())
                .certificateUrl(effectiveCertificateUrl)
                .enrolledAt(enrollment.getEnrolledAt())
                .lastAccessedAt(enrollment.getLastAccessedAt())
                .expiresAt(enrollment.getExpiresAt())
                .suspensionReason(enrollment.getSuspensionReason())
                .courseHasCertificate(canViewCertificate
                        && Boolean.TRUE.equals(enrollment.getCourse().getHasCertificate())
                        && (!requirePaidCourse || enrollment.getCourse().isPaid()))
                .certificateIssuedAt(canViewCertificate ? enrollment.getCertificateIssuedAt() : null)
                .certificateReference(canViewCertificate ? enrollment.getCertificateReference() : null)
                .build();
    }
}