package com.edumind.lms.modules.course.util;

import com.edumind.lms.modules.course.dto.response.EnrollmentResponse;
import com.edumind.lms.modules.course.entity.Enrollment;
import org.springframework.stereotype.Component;

@Component
public class EnrollmentMapper {
    public EnrollmentResponse toResponse(Enrollment enrollment) {
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
                .certificateUrl(enrollment.getCertificateUrl())
                .enrolledAt(enrollment.getEnrolledAt())
                .lastAccessedAt(enrollment.getLastAccessedAt())
                .expiresAt(enrollment.getExpiresAt())
                .suspensionReason(enrollment.getSuspensionReason())
                .build();
    }
}