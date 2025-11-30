package com.edumind.lms.modules.course.service;

import com.edumind.lms.modules.course.entity.Enrollment;
import com.edumind.lms.modules.course.entity.Lesson;
import com.edumind.lms.modules.course.entity.LessonProgress;
import com.edumind.lms.modules.course.exception.EnrollmentNotFoundException;
import com.edumind.lms.modules.course.exception.LessonNotFoundException;
import com.edumind.lms.modules.course.repository.EnrollmentRepository;
import com.edumind.lms.modules.course.repository.LessonProgressRepository;
import com.edumind.lms.modules.course.repository.LessonRepository;
import com.edumind.lms.modules.course.event.LessonCompletedEvent;
import com.edumind.lms.shared.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class LessonProgressServiceImpl implements LessonProgressService {
    private final LessonProgressRepository lessonProgressRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final LessonRepository lessonRepository;
    private final EnrollmentService enrollmentService;
    private final ApplicationEventPublisher eventPublisher;

    @Override
    @Transactional
    public LessonProgress startLesson(Long enrollmentId, Long lessonId, Long studentId) {
        log.info("Starting lesson: {} for enrollment: {}", lessonId, enrollmentId);

        // Validate enrollment exists
        Enrollment enrollment = enrollmentRepository.findById(enrollmentId)
                .orElseThrow(() -> new EnrollmentNotFoundException(enrollmentId));

        // Validate lesson exists
        Lesson lesson = lessonRepository.findById(lessonId)
                .orElseThrow(() -> new LessonNotFoundException(lessonId));

        // Check if progress already exists
        return lessonProgressRepository.findByEnrollmentIdAndLessonIdWithAssociations(enrollmentId, lessonId)
                .orElseGet(() -> {
                    // Create new progress
                    LessonProgress progress = LessonProgress.builder()
                            .enrollment(enrollment)
                            .lesson(lesson)
                            .studentId(studentId)
                            .isCompleted(false)
                            .watchDuration(0)
                            .lastPosition(0)
                            .startedAt(LocalDateTime.now())
                            .build();

                    LessonProgress saved = lessonProgressRepository.save(progress);

                    // Update last accessed
                    enrollmentService.updateLastAccessed(enrollmentId);

                    log.info("Lesson progress created: {}", saved.getId());
                    // Reload with associations to ensure they're available
                    return lessonProgressRepository.findByEnrollmentIdAndLessonIdWithAssociations(enrollmentId, lessonId)
                            .orElse(saved);
                });
    }

    @Override
    @Transactional
    public LessonProgress updateWatchProgress(Long enrollmentId, Long lessonId,
                                              Integer watchDuration, Integer lastPosition) {
        log.debug("Updating watch progress for lesson: {} in enrollment: {}", lessonId, enrollmentId);

        LessonProgress progress = lessonProgressRepository
                .findByEnrollmentIdAndLessonIdWithAssociations(enrollmentId, lessonId)
                .orElseGet(() -> {
                    // Create if doesn't exist
                    Enrollment enrollment = enrollmentRepository.findById(enrollmentId)
                            .orElseThrow(() -> new EnrollmentNotFoundException(enrollmentId));
                    Lesson lesson = lessonRepository.findById(lessonId)
                            .orElseThrow(() -> new LessonNotFoundException(lessonId));

                    LessonProgress newProgress = LessonProgress.builder()
                            .enrollment(enrollment)
                            .lesson(lesson)
                            .studentId(enrollment.getStudentId())
                            .isCompleted(false)
                            .startedAt(LocalDateTime.now())
                            .build();
                    
                    LessonProgress saved = lessonProgressRepository.save(newProgress);
                    // Reload with associations
                    return lessonProgressRepository.findByEnrollmentIdAndLessonIdWithAssociations(enrollmentId, lessonId)
                            .orElse(saved);
                });

        // Update watch time
        progress.setWatchDuration(watchDuration);
        progress.setLastPosition(lastPosition);

        // Auto-complete if watched 90% or more
        if (progress.getLesson().getVideoDuration() != null
                && progress.getLesson().getVideoDuration() > 0) {
            double watchPercentage = (watchDuration * 100.0) / progress.getLesson().getVideoDuration();
            if (watchPercentage >= 90 && !progress.getIsCompleted()) {
                progress.markAsCompleted();

                // Update enrollment progress
                enrollmentService.updateEnrollmentProgress(enrollmentId);

                // Publish event
                publishLessonCompletedEvent(progress);
            }
        }

        LessonProgress updated = lessonProgressRepository.save(progress);
        // Reload with associations to ensure they're available after save
        LessonProgress reloaded = lessonProgressRepository.findByEnrollmentIdAndLessonIdWithAssociations(enrollmentId, lessonId)
                .orElse(updated);

        // Update last accessed
        enrollmentService.updateLastAccessed(enrollmentId);

        return reloaded;
    }

    @Override
    @Transactional
    public LessonProgress markLessonComplete(Long enrollmentId, Long lessonId) {
        log.info("Marking lesson: {} as completed for enrollment: {}", lessonId, enrollmentId);

        LessonProgress progress = lessonProgressRepository
                .findByEnrollmentIdAndLessonIdWithAssociations(enrollmentId, lessonId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "LessonProgress not found for enrollment " + enrollmentId + " and lesson " + lessonId));

        if (!progress.getIsCompleted()) {
            progress.markAsCompleted();
            LessonProgress saved = lessonProgressRepository.save(progress);

            // Update enrollment progress
            enrollmentService.updateEnrollmentProgress(enrollmentId);

            // Publish event
            publishLessonCompletedEvent(saved);

            log.info("Lesson marked as completed: {}", lessonId);
            return saved;
        }

        return progress;
    }

    @Override
    public LessonProgress getLessonProgress(Long enrollmentId, Long lessonId) {
        return lessonProgressRepository.findByEnrollmentIdAndLessonId(enrollmentId, lessonId)
                .orElse(null); // Return null if not started
    }

    @Override
    public List<LessonProgress> getEnrollmentProgress(Long enrollmentId) {
        log.debug("Getting all progress for enrollment: {}", enrollmentId);
        return lessonProgressRepository.findByEnrollmentIdWithAssociations(enrollmentId);
    }

    @Override
    public List<LessonProgress> getCompletedLessons(Long enrollmentId) {
        log.debug("Getting completed lessons for enrollment: {}", enrollmentId);
        return lessonProgressRepository.findByEnrollmentIdAndIsCompletedTrueWithAssociations(enrollmentId);
    }

    @Override
    public boolean isLessonCompleted(Long enrollmentId, Long lessonId) {
        Boolean completed = lessonProgressRepository.isLessonCompleted(enrollmentId, lessonId);
        return completed != null && completed;
    }

    @Override
    public Double getCompletionPercentage(Long enrollmentId, Integer totalLessons) {
        if (totalLessons == 0) {
            return 0.0;
        }
        Double percentage = lessonProgressRepository.getCompletionPercentage(enrollmentId, totalLessons);
        return percentage != null ? percentage : 0.0;
    }

    private void publishLessonCompletedEvent(LessonProgress progress) {
        Enrollment enrollment = progress.getEnrollment();
        Integer progressPercentage = enrollment.getProgressPercentage();

        eventPublisher.publishEvent(new LessonCompletedEvent(
                this,
                progress.getLesson().getCourse().getId(),
                progress.getLesson().getId(),
                progress.getStudentId(),
                progressPercentage
        ));
    }
}
