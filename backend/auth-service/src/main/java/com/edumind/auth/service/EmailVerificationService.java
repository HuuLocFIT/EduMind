package com.edumind.auth.service;

import com.edumind.auth.entity.EmailVerificationToken;
import com.edumind.auth.entity.User;
import com.edumind.auth.event.EmailPayloadFactory;
import com.edumind.auth.event.VerificationEmailRequested;
import com.edumind.auth.repository.EmailVerificationTokenRepository;
import com.edumind.auth.repository.UserRepository;
import com.edumind.common.exception.BadRequestException;
import com.edumind.common.exception.TooManyRequestsException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
public class EmailVerificationService {
    private static final Logger logger = LoggerFactory.getLogger(EmailVerificationService.class);

    @Autowired
    private EmailVerificationTokenRepository tokenRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ApplicationEventPublisher eventPublisher;

    @Autowired
    private EmailPayloadFactory emailPayloadFactory;

    @Autowired
    private EmailVerificationResendRateLimiter resendRateLimiter;

    @Value("${app.auth.email-verification-expiration:86400000}") // 24 hours default
    private long expirationMs;

    @Value("${app.auth.email-verification-resend-max:3}")
    private int resendMax;

    /**
     * Generate and send verification email to user
     */
    @Transactional
    public void sendInitialVerificationEmail(User user) {
        logger.info("📧 Generating email verification token for user: {}", user.getEmail());
        String tokenString = issueVerificationToken(user.getId());
        eventPublisher.publishEvent(emailPayloadFactory.verification(user, tokenString, true));
    }

    /** Issue exactly one active token while holding the user's database row lock. */
    @Transactional
    public String issueVerificationToken(Long userId) {
        User lockedUser = userRepository.findByIdForUpdate(userId)
                .orElseThrow(() -> new BadRequestException("Unable to issue verification token"));
        if (Boolean.TRUE.equals(lockedUser.getIsEmailVerified())) {
            throw new EmailAlreadyVerifiedException();
        }

        LocalDateTime now = LocalDateTime.now();
        tokenRepository.invalidateActiveTokens(lockedUser, now);
        EmailVerificationToken token = new EmailVerificationToken();
        token.setToken(UUID.randomUUID().toString());
        token.setUser(lockedUser);
        token.setExpiryDate(now.plusSeconds(expirationMs / 1000));
        return tokenRepository.save(token).getToken();
    }

    /**
     * Verify email with token
     */
    @Transactional
    public void verifyEmail(String tokenString) {
        logger.info("🔍 Verifying email token");

        // Find token
        EmailVerificationToken token = tokenRepository.findByToken(tokenString)
                .orElseThrow(() -> {
                    logger.error("❌ Invalid email verification token");
                    return new BadRequestException("Invalid verification token");
                });

        User user = token.getUser();
        if (Boolean.TRUE.equals(user.getIsEmailVerified())) {
            logger.info("Email already verified");
            return;
        }

        if (token.isInvalidated()) {
            throw new BadRequestException("This verification link is no longer valid. Please request a new one.");
        }

        if (token.isVerified()) {
            logger.warn("⚠️ Email verification token already used");
            throw new BadRequestException("This verification link has already been used");
        }

        // Check if expired
        if (token.isExpired()) {
            logger.error("❌ Email verification token expired");
            throw new BadRequestException("Verification link has expired. Please request a new one.");
        }

        // Mark token as verified
        token.markAsVerified();
        tokenRepository.save(token);

        // Mark user as verified
        user.setIsEmailVerified(true);
        userRepository.save(user);

        logger.info("✅ Email verified successfully for user: {}", user.getEmail());
    }

    /**
     * Resend verification email
     */
    @Transactional
    public void resendVerificationEmail(String email) {
        String normalizedEmail = email.trim();
        String emailHash = resendRateLimiter.hashEmail(normalizedEmail);
        int attempts = resendRateLimiter.incrementAndGet(emailHash);
        if (attempts > resendMax) {
            throw new TooManyRequestsException("Too many verification requests. Please try again later.");
        }

        User user = userRepository.findByEmail(normalizedEmail).orElse(null);
        if (user == null || Boolean.TRUE.equals(user.getIsEmailVerified())) {
            return;
        }

        String token;
        try {
            token = issueVerificationToken(user.getId());
        } catch (EmailAlreadyVerifiedException exception) {
            // The user may have completed verification after the unlocked lookup above.
            // Preserve the endpoint's generic success response for this expected race.
            return;
        }
        eventPublisher.publishEvent(emailPayloadFactory.verification(user, token, false));
    }

    /**
     * Cleanup expired tokens (scheduled job)
     */
    @Transactional
    public int cleanupExpiredTokens() {
        logger.info("🧹 Cleaning up expired email verification tokens");
        int deleted = tokenRepository.deleteExpiredTokens(LocalDateTime.now());
        logger.info("✅ Deleted {} expired tokens", deleted);
        return deleted;
    }
}
