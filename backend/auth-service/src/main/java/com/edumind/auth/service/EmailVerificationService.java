package com.edumind.auth.service;

import com.edumind.auth.entity.EmailVerificationToken;
import com.edumind.auth.entity.User;
import com.edumind.auth.repository.EmailVerificationTokenRepository;
import com.edumind.auth.repository.UserRepository;
import com.edumind.common.exception.BadRequestException;
import com.edumind.common.exception.EmailSendException;
import com.edumind.common.exception.ResourceNotFoundException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.mail.MailException;

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
    private EmailService emailService;

    @Value("${app.auth.email-verification-expiration:86400000}") // 24 hours default
    private long expirationMs;

    @Value("${app.auth.email-verification-resend-window-minutes:60}")
    private long resendWindowMinutes;

    @Value("${app.auth.email-verification-resend-max:3}")
    private int resendMax;

    /**
     * Helper method to get display name
     * Priority: firstName + lastName > username
     */
    private String getDisplayName(User user) {
        // Check if both firstName and lastName exist
        if (isNotBlank(user.getFirstName()) && isNotBlank(user.getLastName())) {
            return user.getFirstName() + " " + user.getLastName();
        }

        // Check if only firstName exists
        if (isNotBlank(user.getFirstName())) {
            return user.getFirstName();
        }

        // Check if only lastName exists
        if (isNotBlank(user.getLastName())) {
            return user.getLastName();
        }

        // Fallback to username
        if (isNotBlank(user.getUsername())) {
            return user.getUsername();
        }

        // Last resort
        return "User";
    }

    /**
     * Helper method to check if string is not blank
     */
    private boolean isNotBlank(String str) {
        return str != null && !str.trim().isEmpty();
    }

    /**
     * Generate and send verification email to user
     */
    @Transactional(noRollbackFor = {MailException.class, EmailSendException.class})
    public void sendVerificationEmail(User user) {
        logger.info("📧 Generating email verification token for user: {}", user.getEmail());

        // Check if user already verified
        if (Boolean.TRUE.equals(user.getIsEmailVerified())) {
            logger.warn("⚠️ User {} already verified", user.getEmail());
            throw new BadRequestException("Email is already verified");
        }

        // Generate token
        String tokenString = UUID.randomUUID().toString();
        LocalDateTime expiryDate = LocalDateTime.now().plusSeconds(expirationMs / 1000);

        // Create and save token
        EmailVerificationToken token = new EmailVerificationToken();
        token.setToken(tokenString);
        token.setUser(user);
        token.setExpiryDate(expiryDate);

        tokenRepository.save(token);

        // Send email
        try {
            // This method now sends a combined email with both welcome message and verification link
            emailService.sendWelcomeAndVerificationEmail(
                    user.getEmail(),
                    user.getFirstName(),
                    tokenString
            );
            logger.info("✅ Welcome + verification email sent to: {}", user.getEmail());
        } catch (Exception e) {
            logger.error("❌ Failed to send email to: {}", user.getEmail(), e);
            throw e;
        }
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

        // Check if already verified
        if (token.isVerified()) {
            if (Boolean.TRUE.equals(token.getUser().getIsEmailVerified())) {
                logger.info("Email verification token already used for verified user");
                return;
            }
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
        User user = token.getUser();
        user.setIsEmailVerified(true);
        userRepository.save(user);

        logger.info("✅ Email verified successfully for user: {}", user.getEmail());
    }

    /**
     * Resend verification email
     */
    @Transactional
    public void resendVerificationEmail(String email) {
        logger.info("📧 Resending verification email to: {}", email);

        // Find user
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> {
                    logger.error("❌ User not found: {}", email);
                    return new ResourceNotFoundException("User not found with email: " + email);
                });

        // Check if already verified
        if (Boolean.TRUE.equals(user.getIsEmailVerified())) {
            logger.warn("⚠️ User {} already verified", email);
            throw new BadRequestException("Email is already verified");
        }

        // Check rate limiting within a rolling window.
        LocalDateTime windowStart = LocalDateTime.now().minusMinutes(resendWindowMinutes);
        int recentTokenCount = tokenRepository.countByUserAndCreatedAtAfter(user, windowStart);
        if (recentTokenCount >= resendMax) {
            logger.warn("⚠️ Too many verification requests for user: {}", email);
            throw new BadRequestException("Too many verification requests. Please try again later.");
        }

        // Send new verification email
        sendVerificationEmail(user);
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
