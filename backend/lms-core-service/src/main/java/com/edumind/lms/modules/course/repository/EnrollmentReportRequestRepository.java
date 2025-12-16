package com.edumind.lms.modules.course.repository;

import com.edumind.lms.modules.course.entity.EnrollmentReportRequest;
import com.edumind.lms.modules.course.enums.ReportRequestStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface EnrollmentReportRequestRepository extends JpaRepository<EnrollmentReportRequest, Long> {
    Optional<EnrollmentReportRequest> findByEnrollmentIdAndStatus(Long enrollmentId, ReportRequestStatus status);
    
    List<EnrollmentReportRequest> findByStatus(ReportRequestStatus status);
    
    List<EnrollmentReportRequest> findByTeacherId(Long teacherId);
}

