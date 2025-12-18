package com.edumind.lms.modules.course.util;

import com.edumind.lms.modules.course.dto.response.EnrollmentResponse;
import com.edumind.lms.modules.course.entity.Enrollment;
import com.edumind.lms.modules.course.enums.EnrollmentStatus;
import org.springframework.stereotype.Component;

@Component
public class EnrollmentMapper {
    public EnrollmentResponse toResponse(Enrollment enrollment) {
        // Certificate visibility rules:
        // - ACTIVE / COMPLETED / EXPIRED: expose certificate URL as stored.
        // - SUSPENDED: certificate is temporarily locked -> hide URL from client.
        // - DROPPED: enrollment has been cancelled -> certificate is permanently revoked -> hide URL.
        String effectiveCertificateUrl = null;
        if (enrollment.getStatus() == EnrollmentStatus.ACTIVE
                || enrollment.getStatus() == EnrollmentStatus.COMPLETED
                || enrollment.getStatus() == EnrollmentStatus.EXPIRED) {
            effectiveCertificateUrl = enrollment.getCertificateUrl();
        }

        return EnrollmentResponse.builder()
                .id(enrollment.getId())
                .courseId(enrollment.getCourse().getId())
                .courseTitle(enrollment.getCourse().getTitle())
                .courseThumbnail(enrollment.getCourse().getThumbnailUrl())
                .coursePrice(enrollment.getCourse().getPrice())
                .courseIsPaid(enrollment.getCourse().isPaid())
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
                .build();
    }
}