package com.edumind.lms.modules.payment.scheduler;

import com.edumind.lms.modules.payment.entity.InstructorEarning;
import com.edumind.lms.modules.payment.enums.EarningStatus;
import com.edumind.lms.modules.payment.repository.InstructorEarningRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Scheduler to mark earnings as AVAILABLE after the hold period.
 * Runs daily to check for earnings that have passed the hold period.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class EarningAvailabilityScheduler {

    private final InstructorEarningRepository earningRepository;

    @Value("${payment.payout.hold-period-days:30}")
    private int holdPeriodDays;

    /**
     * Mark earnings as AVAILABLE after hold period.
     * Runs daily at 3:00 AM.
     * Cron: "0 0 3 * * ?" = 3:00 AM every day
     */
    @Scheduled(cron = "0 0 3 * * ?")
    @Transactional
    public void markEarningsAvailable() {
        log.info("Starting earning availability check at {}", LocalDateTime.now());

        LocalDateTime thresholdDate = LocalDateTime.now().minusDays(holdPeriodDays);

        // Find PENDING earnings created before the threshold date using DB query
        List<InstructorEarning> pendingEarnings = earningRepository.findByStatusAndCreatedAtBefore(
                EarningStatus.PENDING, thresholdDate);

        if (pendingEarnings.isEmpty()) {
            log.debug("No earnings to mark as available");
            return;
        }

        for (InstructorEarning earning : pendingEarnings) {
            earning.markAsAvailable();
        }
        earningRepository.saveAll(pendingEarnings);

        log.info("Marked {} earnings as AVAILABLE (hold period: {} days)", pendingEarnings.size(), holdPeriodDays);
    }
}
