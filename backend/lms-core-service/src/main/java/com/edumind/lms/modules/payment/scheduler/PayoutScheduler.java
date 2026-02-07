package com.edumind.lms.modules.payment.scheduler;

import com.edumind.lms.modules.payment.service.PayoutService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

/**
 * Scheduler for monthly automated payouts.
 * Runs on the 1st of each month at the configured hour.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class PayoutScheduler {

    private final PayoutService payoutService;

    @Value("${payment.payout.schedule-day:1}")
    private int scheduleDay;

    @Value("${payment.payout.schedule-hour:2}")
    private int scheduleHour;

    /**
     * Schedule monthly payouts.
     * Runs on the 1st of each month at 2:00 AM by default.
     * Cron: second minute hour day month day-of-week
     * "0 0 2 1 * ?" = 2:00 AM on the 1st of every month
     */
    @Scheduled(cron = "${payment.payout.schedule-cron:0 0 2 1 * ?}")
    public void scheduleMonthlyPayouts() {
        log.info("Starting monthly payout scheduling at {}", LocalDateTime.now());

        try {
            var payouts = payoutService.scheduleMonthlyPayouts();
            log.info("Scheduled {} payouts for processing", payouts.size());
        } catch (Exception e) {
            log.error("Error scheduling monthly payouts: {}", e.getMessage(), e);
        }
    }
}
