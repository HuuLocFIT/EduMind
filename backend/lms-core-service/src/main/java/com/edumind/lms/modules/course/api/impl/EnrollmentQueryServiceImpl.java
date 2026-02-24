package com.edumind.lms.modules.course.api.impl;

import com.edumind.lms.modules.course.api.EnrollmentQueryService;
import com.edumind.lms.modules.course.api.dto.EnrollmentInfo;
import com.edumind.lms.modules.course.entity.Enrollment;
import com.edumind.lms.modules.course.enums.EnrollmentStatus;
import com.edumind.lms.modules.course.repository.EnrollmentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class EnrollmentQueryServiceImpl implements EnrollmentQueryService {

    private final EnrollmentRepository enrollmentRepository;

    @Override
    public boolean isStudentEnrolled(Long courseId, Long studentId) {
        return enrollmentRepository.existsByCourseIdAndStudentId(courseId, studentId);
    }

    @Override
    public boolean isStudentEnrolledExcludingDropped(Long courseId, Long studentId) {
        return enrollmentRepository.existsByCourseIdAndStudentIdAndStatusNot(courseId, studentId, EnrollmentStatus.DROPPED);
    }

    @Override
    public List<Long> findEnrolledCourseIds(Long studentId, List<Long> courseIds) {
        return enrollmentRepository.findEnrolledCourseIds(studentId, courseIds);
    }

    @Override
    public Optional<EnrollmentInfo> getEnrollmentInfo(Long courseId, Long studentId) {
        return enrollmentRepository.findByCourseIdAndStudentId(courseId, studentId).map(this::toInfo);
    }

    @Override
    public boolean isEnrolledAndActive(Long courseId, Long userId) {
        return enrollmentRepository.findByCourseIdAndStudentId(courseId, userId)
                .map(enrollment -> {
                    EnrollmentStatus status = enrollment.getStatus();
                    return status == EnrollmentStatus.ACTIVE || status == EnrollmentStatus.COMPLETED;
                })
                .orElse(false);
    }

    private EnrollmentInfo toInfo(Enrollment e) {
        Long courseId = e.getCourse() != null ? e.getCourse().getId() : null;
        return new EnrollmentInfo(
                courseId,
                e.getStudentId(),
                e.getStatus() != null ? e.getStatus().name() : null,
                e.getProgressPercentage(),
                e.getCompletedAt()
        );
    }
}

