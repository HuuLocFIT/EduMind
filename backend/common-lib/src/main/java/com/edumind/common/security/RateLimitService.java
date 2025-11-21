package com.edumind.common.security;

import com.edumind.common.exception.TooManyRequestsException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Service for rate limiting requests with exponential backoff
 *
 * LIMITATIONS (Current Implementation):
 * - In-memory cache (per service instance)
 * - Data NOT shared between services
 * - Data lost on service restart
 * - For horizontal scaling, each instance has separate cache
 *
 * ACCEPTABLE FOR:
 * - Development/testing
 * - Single instance deployments
 * - Per-service rate limiting
 *
 * UPGRADE PATH:
 * - For production: Use Redis-based rate limiting
 * - For cross-service: Implement RedisRateLimitService
 *
 * USAGE:
 * - 2FA verification attempts
 * - Login attempts
 * - Password reset requests
 * - API calls limiting
 * - Any action requiring rate limiting
 */
@Service
public class RateLimitService {
    private static final Logger logger = LoggerFactory.getLogger(RateLimitService.class);

    // Store: userId -> AttemptRecord
    private final Map<Long, AttemptRecord> attemptCache = new ConcurrentHashMap<>();

    // Configuration
    private static final int MAX_ATTEMPTS = 5;
    private static final long INITIAL_LOCKOUT_SECONDS = 60; // 1 minute
    private static final long MAX_LOCKOUT_SECONDS = 3600; // 1 hour

    /**
     * Check if user can attempt action
     * @throws TooManyRequestsException if rate limit exceeded
     */
    public void checkRateLimit(Long userId) {
        AttemptRecord record = attemptCache.get(userId);

        if (record == null) {
            // First attempt
            return;
        }

        // Check if still locked out
        if (record.isLockedOut()) {
            long remainingSeconds = record.getRemainingLockoutSeconds();
            logger.warn("⚠️ User {} is locked out for {} more seconds", userId, remainingSeconds);
            throw new TooManyRequestsException(
                    String.format("Too many failed attempts. Try again in %d seconds.", remainingSeconds)
            );
        }
    }

    /**
     * Record a failed attempt
     * After MAX_ATTEMPTS failures, user will be locked out with exponential backoff
     */
    public void recordFailedAttempt(Long userId) {
        AttemptRecord record = attemptCache.computeIfAbsent(userId, k -> new AttemptRecord());
        record.incrementFailedAttempts();

        if (record.getFailedAttempts() >= MAX_ATTEMPTS) {
            record.lockout();
            logger.warn("🔒 User {} locked out after {} failed attempts", userId, MAX_ATTEMPTS);
        }

        logger.info("Failed attempt for user {}: {}/{}",
                userId, record.getFailedAttempts(), MAX_ATTEMPTS);
    }

    /**
     * Record a successful attempt (reset all attempts)
     */
    public void recordSuccessfulAttempt(Long userId) {
        attemptCache.remove(userId);
        logger.info("✅ Attempts reset for user {}", userId);
    }

    /**
     * Clear lockout for a user (admin function)
     */
    public void clearLockout(Long userId) {
        attemptCache.remove(userId);
        logger.info("🔓 Lockout cleared for user {}", userId);
    }

    /**
     * Get remaining attempts before lockout
     */
    public int getRemainingAttempts(Long userId) {
        AttemptRecord record = attemptCache.get(userId);
        if (record == null) {
            return MAX_ATTEMPTS;
        }
        return Math.max(0, MAX_ATTEMPTS - record.getFailedAttempts());
    }

    /**
     * Check if user is currently locked out
     */
    public boolean isLockedOut(Long userId) {
        AttemptRecord record = attemptCache.get(userId);
        return record != null && record.isLockedOut();
    }

    /**
     * Record class to track attempts and lockout
     */
    private static class AttemptRecord {
        private int failedAttempts = 0;
        private int lockoutCount = 0;
        private Instant lockoutUntil = null;

        public void incrementFailedAttempts() {
            failedAttempts++;
        }

        public int getFailedAttempts() {
            return failedAttempts;
        }

        public void lockout() {
            lockoutCount++;
            // Exponential backoff: 1min, 2min, 4min, 8min, ... up to 1 hour
            long lockoutSeconds = Math.min(
                    INITIAL_LOCKOUT_SECONDS * (1L << (lockoutCount - 1)),
                    MAX_LOCKOUT_SECONDS
            );
            lockoutUntil = Instant.now().plusSeconds(lockoutSeconds);
            failedAttempts = 0; // Reset for next cycle
        }

        public boolean isLockedOut() {
            if (lockoutUntil == null) {
                return false;
            }
            boolean locked = Instant.now().isBefore(lockoutUntil);
            if (!locked) {
                // Lockout expired
                lockoutUntil = null;
            }
            return locked;
        }

        public long getRemainingLockoutSeconds() {
            if (lockoutUntil == null) {
                return 0;
            }
            long remaining = lockoutUntil.getEpochSecond() - Instant.now().getEpochSecond();
            return Math.max(0, remaining);
        }
    }
}