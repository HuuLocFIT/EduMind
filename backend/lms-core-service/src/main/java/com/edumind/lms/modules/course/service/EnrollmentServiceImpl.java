package com.edumind.lms.modules.course.service;

import com.edumind.lms.modules.course.dto.response.EnrollmentStatsResponse;
import com.edumind.lms.modules.course.entity.Course;
import com.edumind.lms.modules.course.entity.Enrollment;
import com.edumind.lms.modules.course.enums.EnrollmentStatus;
import com.edumind.lms.modules.course.exception.*;
import com.edumind.lms.modules.course.repository.CourseRepository;
import com.edumind.lms.modules.course.repository.EnrollmentRepository;
import com.edumind.lms.modules.course.repository.EnrollmentStatisticsProjection;
import com.edumind.lms.modules.course.repository.LessonProgressRepository;
import com.edumind.lms.modules.course.event.CourseCompletedEvent;
import com.edumind.lms.modules.course.event.StudentEnrolledEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigInteger;
import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class EnrollmentServiceImpl implements EnrollmentService {
    private final EnrollmentRepository enrollmentRepository;
    private final CourseRepository courseRepository;
    private final LessonProgressRepository lessonProgressRepository;
    private final ApplicationEventPublisher eventPublisher;
    private final WishlistService wishlistService;

    @Override
    @Transactional
    public Enrollment enrollStudent(Long courseId, Long studentId) {
        log.info("Enrolling student: {} in course: {}", studentId, courseId);

        // Check if course exists and is published
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new CourseNotFoundException(courseId));

        if (!course.isPublished()) {
            throw new CourseNotPublishedException(courseId);
        }

        // Check if already enrolled
        if (enrollmentRepository.existsByCourseIdAndStudentId(courseId, studentId)) {
            throw new AlreadyEnrolledException(courseId, studentId);
        }

        // Create enrollment
        Enrollment enrollment = Enrollment.builder()
                .course(course)
                .studentId(studentId)
                .progressPercentage(0)
                .completedLessons(0)
                .totalLessons(course.getTotalLessons())
                .status(EnrollmentStatus.ACTIVE)
                .enrolledAt(LocalDateTime.now())
                .lastAccessedAt(LocalDateTime.now())
                .build();

        Enrollment savedEnrollment = enrollmentRepository.save(enrollment);

        // Update course statistics
        course.setTotalStudents(course.getTotalStudents() + 1);
        courseRepository.save(course);

        // Publish event
        eventPublisher.publishEvent(new StudentEnrolledEvent(
                this,
                savedEnrollment.getId(),
                courseId,
                studentId
        ));

        // Remove course from wishlist if it exists
        if (wishlistService.isInWishlist(studentId, courseId)) {
            log.info("Removing course {} from wishlist for student {} after enrollment", courseId, studentId);
            wishlistService.removeFromWishlist(studentId, courseId);
        }

        log.info("Student enrolled successfully: enrollment ID {}", savedEnrollment.getId());
        return savedEnrollment;
    }

    @Override
    public Enrollment getEnrollmentById(Long enrollmentId) {
        return enrollmentRepository.findById(enrollmentId)
                .orElseThrow(() -> new EnrollmentNotFoundException(enrollmentId));
    }

    @Override
    public Enrollment getEnrollmentByCourseAndStudent(Long courseId, Long studentId) {
        return enrollmentRepository.findByCourseIdAndStudentId(courseId, studentId)
                .orElseThrow(() -> new EnrollmentNotFoundException(courseId, studentId));
    }

    @Override
    public Page<Enrollment> getStudentEnrollments(Long studentId, Pageable pageable) {
        log.debug("Getting enrollments for student: {}", studentId);
        return enrollmentRepository.findByStudentId(studentId, pageable);
    }

    @Override
    public Page<Enrollment> getStudentEnrollmentsByStatus(Long studentId, EnrollmentStatus status, Pageable pageable) {
        log.debug("Getting enrollments for student: {} with status: {}", studentId, status);
        return enrollmentRepository.findByStudentIdAndStatus(studentId, status, pageable);
    }

    @Override
    public Page<Enrollment> getCourseEnrollments(Long courseId, Pageable pageable) {
        log.debug("Getting enrollments for course: {}", courseId);
        return enrollmentRepository.findByCourseId(courseId, pageable);
    }

    @Override
    @Transactional
    public Enrollment updateEnrollmentProgress(Long enrollmentId) {
        log.debug("Updating progress for enrollment: {}", enrollmentId);

        Enrollment enrollment = getEnrollmentById(enrollmentId);

        // Calculate completion
        long completedCount = lessonProgressRepository.countByEnrollmentIdAndIsCompletedTrue(enrollmentId);
        enrollment.setCompletedLessons((int) completedCount);

        // Calculate percentage
        if (enrollment.getTotalLessons() > 0) {
            int percentage = (int) ((completedCount * 100) / enrollment.getTotalLessons());
            enrollment.setProgressPercentage(percentage);

            // Auto-complete if 100%
            if (percentage >= 100 && enrollment.getStatus() == EnrollmentStatus.ACTIVE) {
                return completeCourse(enrollmentId);
            }
        }

        Enrollment updated = enrollmentRepository.save(enrollment);
        log.debug("Enrollment progress updated: {}%", updated.getProgressPercentage());
        return updated;
    }

    @Override
    @Transactional
    public Enrollment completeCourse(Long enrollmentId) {
        log.info("Completing course for enrollment: {}", enrollmentId);

        Enrollment enrollment = getEnrollmentById(enrollmentId);

        if (enrollment.getStatus() == EnrollmentStatus.COMPLETED) {
            log.warn("Enrollment already completed: {}", enrollmentId);
            return enrollment;
        }

        // Mark as completed
        enrollment.setStatus(EnrollmentStatus.COMPLETED);
        enrollment.setCompletedAt(LocalDateTime.now());
        enrollment.setProgressPercentage(100);

        Enrollment completedEnrollment = enrollmentRepository.save(enrollment);

        // Publish event
        eventPublisher.publishEvent(new CourseCompletedEvent(
                this,
                enrollment.getCourse().getId(),
                enrollment.getStudentId(),
                enrollmentId
        ));

        log.info("Course completed successfully: enrollment ID {}", enrollmentId);
        return completedEnrollment;
    }

    @Override
    @Transactional
    public void updateLastAccessed(Long enrollmentId) {
        Enrollment enrollment = getEnrollmentById(enrollmentId);
        enrollment.setLastAccessedAt(LocalDateTime.now());
        enrollmentRepository.save(enrollment);
    }

    @Override
    public boolean isStudentEnrolled(Long courseId, Long studentId) {
        return enrollmentRepository.existsByCourseIdAndStudentId(courseId, studentId);
    }

    @Override
    public List<Enrollment> getInProgressCourses(Long studentId, Integer minProgress) {
        log.debug("Getting in-progress courses for student: {} with min progress: {}", studentId, minProgress);
        return enrollmentRepository.findInProgressCourses(studentId, minProgress);
    }

    @Override
    public List<Enrollment> getCompletedCourses(Long studentId) {
        log.debug("Getting completed courses for student: {}", studentId);
        return enrollmentRepository.findCompletedEnrollmentsByStudent(studentId);
    }

    @Override
    public List<Enrollment> getRecentlyAccessedCourses(Long studentId, int limit) {
        log.debug("Getting recently accessed courses for student: {} (limit: {})", studentId, limit);
        Pageable pageable = PageRequest.of(0, limit);
        return enrollmentRepository.findRecentlyAccessedCourses(studentId, pageable);
    }

    @Override
    public EnrollmentStatsResponse getEnrollmentStats(Long studentId) {
        log.debug("Getting enrollment statistics for student: {}", studentId);

        // Get statistics from repository using interface projection for type safety
        // This eliminates magic numbers (array indices) and maps by field names
        EnrollmentStatisticsProjection stats = enrollmentRepository.getStudentStatistics(studentId);

        // Handle null case (no enrollments found)
        if (stats == null) {
            log.debug("No statistics found for student: {}, returning zeros", studentId);
            return EnrollmentStatsResponse.builder()
                    .total(0L)
                    .active(0L)
                    .completed(0L)
                    .started(0L)
                    .build();
        }

        // Map projection to response - using getter methods instead of array indices
        // This is type-safe and won't break if query column order changes
        return EnrollmentStatsResponse.builder()
                .total(parseToLong(stats.getTotal()))
                .active(parseToLong(stats.getActive()))
                .completed(parseToLong(stats.getCompleted()))
                .started(parseToLong(stats.getStarted()))
                .build();
    }

    /**
     * Safely parse Object to Long, handling Long, BigInteger, and null cases
     */
    private Long parseToLong(Object value) {
        if (value == null) {
            return 0L;
        }
        if (value instanceof Long) {
            return (Long) value;
        }
        if (value instanceof BigInteger) {
            return ((BigInteger) value).longValue();
        }
        if (value instanceof Number) {
            return ((Number) value).longValue();
        }
        // Fallback: try to parse as string
        try {
            return Long.parseLong(value.toString());
        } catch (NumberFormatException e) {
            log.warn("Failed to parse value to Long: {}", value, e);
            return 0L;
        }
    }
}
