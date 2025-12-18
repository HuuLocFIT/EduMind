package com.edumind.lms.modules.course.entity;

import com.edumind.lms.modules.course.enums.ReportRequestStatus;
import com.edumind.lms.shared.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "enrollment_report_requests", schema = "course")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EnrollmentReportRequest extends BaseEntity {
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "enrollment_id", nullable = false)
    private Enrollment enrollment;

    @Column(nullable = false)
    private Long teacherId;

    @Column(nullable = false, length = 500)
    private String reason;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ReportRequestStatus status = ReportRequestStatus.PENDING;

    @Column(length = 1000)
    private String adminNotes;

    private LocalDateTime reviewedAt;
    private Long reviewedByAdminId;

    @Column(nullable = false)
    private LocalDateTime requestedAt = LocalDateTime.now();
}

