package com.edumind.auth.scheduler;

import com.edumind.auth.entity.Role;
import com.edumind.auth.entity.RoleName;
import com.edumind.auth.entity.User;
import com.edumind.auth.repository.RoleRepository;
import com.edumind.auth.repository.UserRepository;
import com.edumind.auth.service.EmailService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Component
public class TrialExpiryScheduler {
    private static final Logger logger = LoggerFactory.getLogger(TrialExpiryScheduler.class);
    private static final int REMINDER_DAYS = 7; // Send reminder 7 days before expiry

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private EmailService emailService;

    /**
     * Check for expiring trials every day at 00:00
     * Cron: 0 0 0 * * * = At 00:00:00 every day
     */
    @Scheduled(cron = "0 0 0 * * *")
    @Transactional
    public void checkExpiringTrials() {
        logger.info("🔄 Starting scheduled job: Check expiring trials");

        try {
            Role trialRole = roleRepository.findByName(RoleName.ROLE_TEACHER_TRIAL).orElse(null);
            if (trialRole == null) {
                logger.warn("⚠️ TEACHER_TRIAL role not found");
                return;
            }

            // Find all trial teachers
            List<User> trialTeachers = userRepository.findByRolesContaining(trialRole);
            logger.info("📊 Found {} trial teachers to check", trialTeachers.size());

            int remindersSent = 0;
            int trialsExpired = 0;

            for (User user : trialTeachers) {
                if (user.getTrialEndDate() == null) {
                    logger.warn("⚠️ User {} has TEACHER_TRIAL role but no trial_end_date", user.getUsername());
                    continue;
                }

                LocalDateTime now = LocalDateTime.now();
                long daysRemaining = ChronoUnit.DAYS.between(now, user.getTrialEndDate());

                // Trial expired
                if (daysRemaining <= 0) {
                    handleExpiredTrial(user);
                    trialsExpired++;
                }
                // Send reminder 7 days before expiry
                else if (daysRemaining == REMINDER_DAYS) {
                    emailService.sendTrialExpiryReminderEmail(user, daysRemaining);
                    remindersSent++;
                }
            }

            logger.info("✅ Trial check completed: {} reminders sent, {} trials expired",
                    remindersSent, trialsExpired);

        } catch (Exception e) {
            logger.error("❌ Error checking expiring trials", e);
        }
    }

    /**
     * Handle expired trial
     * Options:
     * 1. Auto-disable account (recommended)
     * 2. Auto-downgrade to STUDENT
     * 3. Just send email notification
     */
    private void handleExpiredTrial(User user) {
        logger.info("⚠️ Trial expired for user: {}", user.getUsername());

        // Send email notification
        emailService.sendTrialExpiredEmail(user);

        // Option 1: Disable account (RECOMMENDED - requires admin action to upgrade)
        user.setIsActive(false);
        userRepository.save(user);
        logger.info("🔒 Account disabled for expired trial: {}", user.getUsername());

        // Option 2: Auto-downgrade to STUDENT (uncomment if preferred)
        // Role studentRole = roleRepository.findByName("STUDENT")
        //         .orElseThrow(() -> new RuntimeException("STUDENT role not found"));
        // Role trialRole = roleRepository.findByName("TEACHER_TRIAL")
        //         .orElseThrow(() -> new RuntimeException("TEACHER_TRIAL role not found"));
        //
        // Set<Role> roles = new HashSet<>(user.getRoles());
        // roles.remove(trialRole);
        // roles.add(studentRole);
        // user.setRoles(roles);
        // user.setIsTrial(false);
        // userRepository.save(user);
        // logger.info("⬇️ User downgraded to STUDENT: {}", user.getUsername());
    }
}