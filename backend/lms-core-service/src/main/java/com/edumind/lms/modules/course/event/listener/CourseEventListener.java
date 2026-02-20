package com.edumind.lms.modules.course.event.listener;

import com.edumind.lms.modules.course.api.EnrollmentCommandService;
import com.edumind.lms.modules.payment.event.OrderCompletedEvent;
import com.edumind.lms.modules.payment.event.RefundCompletedEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Slf4j
@Component
@RequiredArgsConstructor
public class CourseEventListener {

    private final EnrollmentCommandService enrollmentCommandService;

    @Async("taskExecutor")
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void handleEnrollmentCreation(OrderCompletedEvent event) {
        if (event.getItems() == null || event.getItems().isEmpty()) {
            log.warn("OrderCompletedEvent has no items: orderId={}, orderNumber={}",
                    event.getOrderId(), event.getOrderNumber());
            return;
        }

        int succeeded = 0;
        int failed = 0;
        for (var item : event.getItems()) {
            try {
                enrollmentCommandService.enrollStudent(item.courseId(), event.getUserId());
                succeeded++;
            } catch (Exception e) {
                failed++;
                log.error("Failed to enroll user {} in course {} for order {}: {}",
                        event.getUserId(), item.courseId(), event.getOrderNumber(), e.getMessage());
            }
        }
        log.info("Enrollment creation for order {}: succeeded={}, failed={}",
                event.getOrderNumber(), succeeded, failed);
    }

    @Async("taskExecutor")
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void handleRefundEnrollmentRevocation(RefundCompletedEvent event) {
        if (!event.isFullRefund()) {
            log.info("Skipping enrollment revocation for partial refund: orderId={}, userId={}",
                    event.getOrderId(), event.getUserId());
            return;
        }

        if (event.getCourseIds() == null || event.getCourseIds().isEmpty()) {
            log.warn("RefundCompletedEvent has no courseIds: orderId={}, userId={}",
                    event.getOrderId(), event.getUserId());
            return;
        }

        int succeeded = 0;
        int failed = 0;
        for (Long courseId : event.getCourseIds()) {
            try {
                enrollmentCommandService.revokeEnrollment(courseId, event.getUserId());
                succeeded++;
            } catch (Exception e) {
                failed++;
                log.error("Failed to revoke enrollment user {} in course {} for refund(orderId={}): {}",
                        event.getUserId(), courseId, event.getOrderId(), e.getMessage());
            }
        }
        log.info("Enrollment revocation for refund orderId={}: succeeded={}, failed={}",
                event.getOrderId(), succeeded, failed);
    }
}

