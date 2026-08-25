package com.edumind.auth.scheduler;

import com.edumind.auth.service.EmailVerificationService;
import com.edumind.auth.service.PasswordResetRateLimiter;
import com.edumind.auth.service.EmailVerificationResendRateLimiter;
import com.edumind.auth.service.PasswordResetService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Scheduled job to cleanup expired tokens
 * Runs daily at 2:00 AM
 */
@Component
public class TokenCleanupScheduler {
    private static final Logger logger = LoggerFactory.getLogger(TokenCleanupScheduler.class);

    @Autowired
    private EmailVerificationService emailVerificationService;

    @Autowired
    private PasswordResetService passwordResetService;

    @Autowired
    private PasswordResetRateLimiter passwordResetRateLimiter;

    @Autowired
    private EmailVerificationResendRateLimiter emailVerificationResendRateLimiter;

    /** Retention window for password reset rate-limit buckets. */
    private static final long PASSWORD_RESET_BUCKET_RETENTION_HOURS = 24;
    private static final long EMAIL_VERIFICATION_BUCKET_RETENTION_HOURS = 24;

    /**
     * Cleanup expired email verification tokens
     * Runs daily at 2:00 AM
     */
    @Scheduled(cron = "0 0 2 * * *")
    public void cleanupExpiredEmailVerificationTokens() {
        logger.info("🧹 Starting cleanup of expired email verification tokens");

        try {
            int deleted = emailVerificationService.cleanupExpiredTokens();
            logger.info("✅ Cleanup completed: {} email verification tokens deleted", deleted);
        } catch (Exception e) {
            logger.error("❌ Error during email verification token cleanup", e);
        }

        try {
            int deletedBuckets = emailVerificationResendRateLimiter
                    .cleanupOlderThan(EMAIL_VERIFICATION_BUCKET_RETENTION_HOURS);
            logger.info("✅ Cleanup completed: {} verification resend rate-limit buckets", deletedBuckets);
        } catch (Exception e) {
            logger.error("❌ Error during verification resend rate-limit bucket cleanup", e);
        }
    }

    /**
     * Cleanup expired and used password reset tokens
     * Runs daily at 2:30 AM
     */
    @Scheduled(cron = "0 30 2 * * *")
    public void cleanupPasswordResetTokens() {
        logger.info("🧹 Starting cleanup of password reset tokens");

        try {
            int deleted = passwordResetService.cleanupTokens();
            logger.info("✅ Cleanup completed: {} password reset tokens deleted", deleted);
        } catch (Exception e) {
            logger.error("❌ Error during password reset token cleanup", e);
        }

        try {
            int deletedBuckets = passwordResetRateLimiter.cleanupOlderThan(PASSWORD_RESET_BUCKET_RETENTION_HOURS);
            logger.info("✅ Cleanup completed: {} password reset rate-limit buckets deleted", deletedBuckets);
        } catch (Exception e) {
            logger.error("❌ Error during password reset rate-limit bucket cleanup", e);
        }
    }
}
