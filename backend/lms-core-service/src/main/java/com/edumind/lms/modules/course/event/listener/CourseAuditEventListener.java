package com.edumind.lms.modules.course.event.listener;

import com.edumind.lms.modules.course.event.*;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Slf4j
@Component
public class CourseAuditEventListener {

    @Async("taskExecutor")
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void handleEnrollmentSuspended(EnrollmentSuspendedEvent event) {
        log.warn("[AUDIT] Enrollment suspended: enrollmentId={}, courseId={}, studentId={}, reason={}",
                event.getEnrollmentId(), event.getCourseId(), event.getStudentId(), event.getReason());
        // TODO: trigger notification when notification module is ready
    }

    @Async("taskExecutor")
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void handleEnrollmentActivated(EnrollmentActivatedEvent event) {
        log.info("[AUDIT] Enrollment activated: enrollmentId={}, courseId={}, studentId={}",
                event.getEnrollmentId(), event.getCourseId(), event.getStudentId());
        // TODO: trigger notification when notification module is ready
    }

    @Async("taskExecutor")
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void handleEnrollmentDropped(EnrollmentDroppedEvent event) {
        log.info("[AUDIT] Enrollment dropped: enrollmentId={}, courseId={}, studentId={}",
                event.getEnrollmentId(), event.getCourseId(), event.getStudentId());
        // TODO: trigger notification when notification module is ready
    }

    @Async("taskExecutor")
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void handleEnrollmentReportCreated(EnrollmentReportCreatedEvent event) {
        log.warn("[AUDIT] Enrollment report created: reportRequestId={}, enrollmentId={}, courseId={}, teacherId={}",
                event.getReportRequestId(), event.getEnrollmentId(), event.getCourseId(), event.getTeacherId());
        // TODO: trigger notification when notification module is ready
    }

    @Async("taskExecutor")
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void handleCourseArchived(CourseArchivedEvent event) {
        log.warn("[AUDIT] Course archived: courseId={}, courseTitle={}, instructorId={}, archivedByUserId={}",
                event.getCourseId(), event.getCourseTitle(), event.getInstructorId(), event.getArchivedByUserId());
        // TODO: trigger notification when notification module is ready
    }

    @Async("taskExecutor")
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void handleCourseDeleted(CourseDeletedEvent event) {
        log.warn("[AUDIT] Course deleted: courseId={}, courseTitle={}, instructorId={}, softDelete={}",
                event.getCourseId(), event.getCourseTitle(), event.getInstructorId(), event.isSoftDelete());
        // TODO: trigger notification when notification module is ready
    }

    @Async("taskExecutor")
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void handleCourseUpdated(CourseUpdatedEvent event) {
        log.info("[AUDIT] Course updated: courseId={}, instructorId={}",
                event.getCourseId(), event.getInstructorId());
        // TODO: trigger notification when notification module is ready
    }

    @Async("taskExecutor")
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void handleReviewRejected(ReviewRejectedEvent event) {
        log.warn("[AUDIT] Review rejected: reviewId={}, courseId={}, studentId={}",
                event.getReviewId(), event.getCourseId(), event.getStudentId());
        // TODO: trigger notification when notification module is ready
    }

    @Async("taskExecutor")
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void handleReviewUpdated(ReviewUpdatedEvent event) {
        log.info("[AUDIT] Review updated: reviewId={}, courseId={}, studentId={}",
                event.getReviewId(), event.getCourseId(), event.getStudentId());
        // TODO: trigger notification when notification module is ready
    }

    @Async("taskExecutor")
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void handleReviewDeleted(ReviewDeletedEvent event) {
        log.warn("[AUDIT] Review deleted: reviewId={}, courseId={}, studentId={}, deletedByAdmin={}",
                event.getReviewId(), event.getCourseId(), event.getStudentId(), event.isDeletedByAdmin());
        // TODO: trigger notification when notification module is ready
    }

    @Async("taskExecutor")
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void handleInstructorRepliedToReview(InstructorRepliedToReviewEvent event) {
        log.info("[AUDIT] Instructor replied to review: reviewId={}, courseId={}, studentId={}, instructorId={}",
                event.getReviewId(), event.getCourseId(), event.getStudentId(), event.getInstructorId());
        // TODO: trigger notification when notification module is ready
    }

    @Async("taskExecutor")
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void handleLessonStarted(LessonStartedEvent event) {
        log.info("[AUDIT] Lesson started: lessonId={}, courseId={}, enrollmentId={}, studentId={}",
                event.getLessonId(), event.getCourseId(), event.getEnrollmentId(), event.getStudentId());
        // TODO: trigger notification when notification module is ready
    }

    @Async("taskExecutor")
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void handleCategoryCreated(CategoryCreatedEvent event) {
        log.info("[AUDIT] Category created: categoryId={}, categoryName={}",
                event.getCategoryId(), event.getCategoryName());
        // TODO: trigger notification when notification module is ready
    }

    @Async("taskExecutor")
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void handleCategoryUpdated(CategoryUpdatedEvent event) {
        log.info("[AUDIT] Category updated: categoryId={}, categoryName={}",
                event.getCategoryId(), event.getCategoryName());
        // TODO: trigger notification when notification module is ready
    }

    @Async("taskExecutor")
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void handleCategoryDeleted(CategoryDeletedEvent event) {
        log.warn("[AUDIT] Category deleted: categoryId={}, categoryName={}",
                event.getCategoryId(), event.getCategoryName());
        // TODO: trigger notification when notification module is ready
    }

    @Async("taskExecutor")
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void handleCategoryStatusChanged(CategoryStatusChangedEvent event) {
        log.info("[AUDIT] Category status changed: categoryId={}, categoryName={}, active={}",
                event.getCategoryId(), event.getCategoryName(), event.isActive());
        // TODO: trigger notification when notification module is ready
    }
}
