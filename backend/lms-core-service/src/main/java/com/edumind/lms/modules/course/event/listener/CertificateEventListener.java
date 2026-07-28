package com.edumind.lms.modules.course.event.listener;

import com.edumind.lms.modules.course.event.CourseCompletedEvent;
import com.edumind.lms.modules.course.service.CertificateServiceImpl;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Slf4j
@Component
@RequiredArgsConstructor
public class CertificateEventListener {

    private final CertificateServiceImpl certificateService;

    @Async("taskExecutor")
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onCourseCompleted(CourseCompletedEvent event) {
        log.info("Processing certificate generation for enrollment {}", event.getEnrollmentId());
        try {
            certificateService.generateCertificate(event.getEnrollmentId());
        } catch (Exception e) {
            log.error("Certificate generation failed for enrollment {}: {}",
                    event.getEnrollmentId(), e.getMessage(), e);
        }
    }
}
