package com.edumind.lms.modules.course.dto.response;

import com.edumind.lms.modules.course.enums.ReportRequestStatus;
import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class EnrollmentReportResponse {
    // Report fields
    private Long id;
    private ReportRequestStatus status;
    private String reason;
    private String adminNotes;
    private LocalDateTime requestedAt;
    private LocalDateTime reviewedAt;
    private Long reviewedByAdminId;
    private Long teacherId;

    // Enrollment fields
    private Long enrollmentId;
    private Long courseId;
    private String courseTitle;
    private Long studentId;
    private String studentName;
    private String studentEmail;
}
