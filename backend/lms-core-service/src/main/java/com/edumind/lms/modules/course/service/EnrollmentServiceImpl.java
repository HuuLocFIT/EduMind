package com.edumind.lms.modules.course.service;

import com.edumind.lms.modules.course.dto.response.EnrollmentStatsResponse;
import com.edumind.lms.modules.course.entity.Course;
import com.edumind.lms.modules.course.entity.Enrollment;
import com.edumind.lms.modules.course.enums.EnrollmentStatus;
import com.edumind.lms.modules.course.exception.*;
import com.edumind.lms.modules.course.repository.CourseRepository;
import com.edumind.lms.modules.course.repository.EnrollmentRepository;
import com.edumind.lms.modules.course.repository.EnrollmentReportRequestRepository;
import com.edumind.lms.modules.course.repository.EnrollmentStatisticsProjection;
import com.edumind.lms.modules.course.repository.LessonProgressRepository;
import com.edumind.lms.modules.course.entity.EnrollmentReportRequest;
import com.edumind.lms.modules.course.enums.ReportRequestStatus;
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
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class EnrollmentServiceImpl implements EnrollmentService {
    private final EnrollmentRepository enrollmentRepository;
    private final CourseRepository courseRepository;
    private final LessonProgressRepository lessonProgressRepository;
    private final EnrollmentReportRequestRepository reportRequestRepository;
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

        // Security: Prevent instructor from enrolling in their own course
        if (course.getInstructorId().equals(studentId)) {
            log.warn("Instructor {} attempted to enroll in their own course {}", studentId, courseId);
            throw new AlreadyEnrolledException(courseId, studentId);
        }

        // Check if already enrolled (excluding DROPPED - allow re-enrollment after drop)
        Optional<Enrollment> existingEnrollmentOpt = enrollmentRepository.findByCourseIdAndStudentId(courseId, studentId);
        Enrollment savedEnrollment;
        
        if (existingEnrollmentOpt.isPresent()) {
            Enrollment existing = existingEnrollmentOpt.get();
            // If enrollment exists and is NOT DROPPED, throw exception
            if (existing.getStatus() != EnrollmentStatus.DROPPED) {
                throw new AlreadyEnrolledException(courseId, studentId);
            }
            // If DROPPED, reactivate and restore with Sync & Update (Recalculate on Re-entry)
            log.info("Re-enrolling student {} in course {} (previous enrollment was DROPPED) - Restoring with Sync & Update", studentId, courseId);
            
            // Step 1: Sync - Get current total lessons from course (New Total)
            int newTotalLessons = course.getTotalLessons();
            existing.setTotalLessons(newTotalLessons);
            
            // Step 2: Update - Count actual completed lessons from LessonProgress (Actual Completed)
            long actualCompletedLessons = lessonProgressRepository.countByEnrollmentIdAndIsCompletedTrue(existing.getId());
            existing.setCompletedLessons((int) actualCompletedLessons);
            
            // Step 3: Recalculate progress percentage and status
            int newProgressPercentage = 0;
            if (newTotalLessons > 0) {
                newProgressPercentage = (int) ((actualCompletedLessons * 100) / newTotalLessons);
            }
            existing.setProgressPercentage(newProgressPercentage);
            
            // Step 4: Update status based on recalculated progress
            EnrollmentStatus newStatus;
            if (newProgressPercentage >= 100) {
                newStatus = EnrollmentStatus.COMPLETED;
                // If completing now, set completedAt
                if (existing.getCompletedAt() == null) {
                    existing.setCompletedAt(LocalDateTime.now());
                }
            } else {
                // If progress < 100%, set to ACTIVE (even if was COMPLETED before)
                newStatus = EnrollmentStatus.ACTIVE;
                // Clear completion date and certificate if status changes from COMPLETED to ACTIVE
                if (existing.getStatus() == EnrollmentStatus.COMPLETED) {
                    log.info("Enrollment {} was COMPLETED but recalculated progress is {}% - changing to ACTIVE", 
                            existing.getId(), newProgressPercentage);
                    existing.setCompletedAt(null);
                    existing.setCertificateIssuedAt(null);
                    existing.setCertificateUrl(null);
                }
            }
            existing.setStatus(newStatus);
            
            // Step 5: Update other fields (restore, don't reset)
            existing.setLastAccessedAt(LocalDateTime.now());
            existing.setSuspensionReason(null); // Clear suspension reason if any
            // Keep enrolledAt as original (don't reset enrollment date)
            // Keep expiresAt if it was set
            
            savedEnrollment = enrollmentRepository.save(existing);
            log.info("Enrollment {} reactivated and recalculated: totalLessons={} (synced), completedLessons={} (actual), progress={}%, status={}", 
                    savedEnrollment.getId(), newTotalLessons, actualCompletedLessons, newProgressPercentage, newStatus);
        } else {
            // Create new enrollment
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

            savedEnrollment = enrollmentRepository.save(enrollment);
        }

        // Update course statistics (only increment if this is a new enrollment, not a reactivated DROPPED one)
        // Protection against integer overflow
        int currentStudents = course.getTotalStudents() != null ? course.getTotalStudents() : 0;
        if (currentStudents < Integer.MAX_VALUE) {
            course.setTotalStudents(currentStudents + 1);
            courseRepository.save(course);
        } else {
            log.warn("Course {} has reached maximum student count, cannot increment further", courseId);
        }

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
        log.debug("Getting enrollments for student: {} (excluding DROPPED)", studentId);
        // Use database-level filtering for better performance
        // Previously loaded all enrollments into memory which could cause OOM with large datasets
        return enrollmentRepository.findByStudentIdAndStatusNot(studentId, EnrollmentStatus.DROPPED, pageable);
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
        // Check if student is enrolled, excluding DROPPED enrollments
        Optional<Enrollment> enrollment = enrollmentRepository.findByCourseIdAndStudentId(courseId, studentId);
        return enrollment.isPresent() && enrollment.get().getStatus() != EnrollmentStatus.DROPPED;
    }

    @Override
    public List<Enrollment> getInProgressCourses(Long studentId, Integer minProgress) {
        log.debug("Getting in-progress courses for student: {} with min progress: {} (excluding DROPPED)", studentId, minProgress);
        // Filter out DROPPED enrollments from in-progress courses
        return enrollmentRepository.findInProgressCourses(studentId, minProgress).stream()
                .filter(enrollment -> enrollment.getStatus() != EnrollmentStatus.DROPPED)
                .collect(java.util.stream.Collectors.toList());
    }

    @Override
    public List<Enrollment> getCompletedCourses(Long studentId) {
        log.debug("Getting completed courses for student: {} (excluding DROPPED)", studentId);
        // Filter out DROPPED enrollments - even if they were completed before being dropped
        return enrollmentRepository.findCompletedEnrollmentsByStudent(studentId).stream()
                .filter(enrollment -> enrollment.getStatus() != EnrollmentStatus.DROPPED)
                .collect(java.util.stream.Collectors.toList());
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

    @Override
    @Transactional
    public void suspendEnrollment(Long enrollmentId, String reason) {
        log.info("Suspending enrollment: {} with reason: {}", enrollmentId, reason);
        Enrollment enrollment = getEnrollmentById(enrollmentId);

        if (enrollment.getStatus() == EnrollmentStatus.SUSPENDED) {
            log.debug("Enrollment {} is already suspended", enrollmentId);
            return;
        }

        enrollment.setStatus(EnrollmentStatus.SUSPENDED);
        enrollment.setSuspensionReason(reason);
        enrollmentRepository.save(enrollment);
        log.info("Enrollment {} suspended successfully with reason: {}", enrollmentId, reason);
    }

    @Override
    @Transactional
    public void activateEnrollment(Long enrollmentId) {
        log.info("Re-activating enrollment: {}", enrollmentId);
        Enrollment enrollment = getEnrollmentById(enrollmentId);

        if (enrollment.getStatus() == EnrollmentStatus.ACTIVE) {
            log.debug("Enrollment {} is already active", enrollmentId);
            return;
        }

        // Do not auto-activate expired/completed enrollments to avoid breaking business rules
        if (enrollment.getStatus() == EnrollmentStatus.EXPIRED || enrollment.getStatus() == EnrollmentStatus.COMPLETED) {
            log.warn("Cannot activate enrollment {} because status is {}", enrollmentId, enrollment.getStatus());
            return;
        }

        enrollment.setStatus(EnrollmentStatus.ACTIVE);
        enrollmentRepository.save(enrollment);
        log.info("Enrollment {} activated successfully", enrollmentId);
    }

    @Override
    @Transactional
    public void unenrollStudent(Long enrollmentId) {
        log.info("Unenrolling student from enrollment: {}", enrollmentId);
        Enrollment enrollment = getEnrollmentById(enrollmentId);
        
        // Check if already DROPPED - don't process again
        if (enrollment.getStatus() == EnrollmentStatus.DROPPED) {
            log.warn("Enrollment {} is already DROPPED - skipping unenroll operation", enrollmentId);
            return;
        }
        
        Course course = enrollment.getCourse();

        // Only decrement totalStudents if enrollment was not already DROPPED
        // (to avoid double-counting if unenroll is called multiple times)
        if (course != null && course.getTotalStudents() != null && course.getTotalStudents() > 0) {
            course.setTotalStudents(course.getTotalStudents() - 1);
            courseRepository.save(course);
            log.debug("Decremented totalStudents for course {} to {}", course.getId(), course.getTotalStudents());
        }

        // Mark enrollment as DROPPED instead of hard deleting to allow future re-enrollment
        enrollment.setStatus(EnrollmentStatus.DROPPED);
        enrollment.setLastAccessedAt(LocalDateTime.now());
        enrollmentRepository.save(enrollment);
        log.info("Enrollment {} marked as DROPPED successfully", enrollmentId);
    }

    @Override
    @Transactional
    public void reportToAdmin(Long enrollmentId, Long teacherId, String reason) {
        log.info("Teacher {} reporting enrollment {} to admin with reason: {}", teacherId, enrollmentId, reason);
        
        Enrollment enrollment = getEnrollmentById(enrollmentId);
        
        // Verify this is a paid course
        if (!enrollment.getCourse().isPaid()) {
            log.warn("Teacher {} attempted to report non-paid course enrollment {} - this should not happen", teacherId, enrollmentId);
            throw new IllegalStateException("Report to admin is only available for paid courses. You can unenroll students from free courses directly.");
        }
        
        // Check if there's already a pending request for this enrollment
        reportRequestRepository.findByEnrollmentIdAndStatus(enrollmentId, ReportRequestStatus.PENDING)
            .ifPresent(existing -> {
                log.warn("Pending report request already exists for enrollment {}", enrollmentId);
                throw new IllegalStateException("A pending report request already exists for this enrollment. Please wait for admin review.");
            });
        
        // Create new report request
        EnrollmentReportRequest reportRequest = EnrollmentReportRequest.builder()
                .enrollment(enrollment)
                .teacherId(teacherId)
                .reason(reason)
                .status(ReportRequestStatus.PENDING)
                .requestedAt(LocalDateTime.now())
                .build();
        
        reportRequestRepository.save(reportRequest);
        log.info("Report request {} created successfully for enrollment {}", reportRequest.getId(), enrollmentId);
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
