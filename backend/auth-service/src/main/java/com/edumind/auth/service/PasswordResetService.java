package com.edumind.auth.service;

import com.edumind.auth.entity.PasswordResetToken;
import com.edumind.auth.entity.User;
import com.edumind.auth.repository.PasswordResetTokenRepository;
import com.edumind.auth.repository.UserRepository;
import com.edumind.common.exception.BadRequestException;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
public class PasswordResetService {
    private static final Logger logger = LoggerFactory.getLogger(PasswordResetService.class);

    @Autowired
    private PasswordResetTokenRepository tokenRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private EmailService emailService;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Value("${app.auth.password-reset-expiration:3600000}") // 1 hour default
    private long expirationMs;

    /**
     * Request password reset - send email with token
     */
    @Transactional
    public void requestPasswordReset(String email, HttpServletRequest request) {
        logger.info("📧 Password reset requested for email: {}", email);

        // Find user (don't reveal if user exists or not for security)
        User user = userRepository.findByEmail(email).orElse(null);

        if (user == null) {
            logger.warn("⚠️ Password reset requested for non-existent email: {}", email);
            // Still return success to prevent email enumeration
            return;
        }

        // Check rate limiting - prevent spam (max 3 requests per hour)
        int recentTokenCount = tokenRepository.countByUserAndUsedFalse(user);
        if (recentTokenCount >= 3) {
            logger.warn("⚠️ Too many reset requests for user: {}", email);
            throw new BadRequestException("Too many password reset requests. Please try again later.");
        }

        // Generate token
        String tokenString = UUID.randomUUID().toString();
        LocalDateTime expiryDate = LocalDateTime.now().plusSeconds(expirationMs / 1000);

        // Create and save token
        PasswordResetToken token = new PasswordResetToken();
        token.setToken(tokenString);
        token.setUser(user);
        token.setExpiryDate(expiryDate);
        token.setIpAddress(getClientIP(request));
        token.setUserAgent(request.getHeader("User-Agent"));

        tokenRepository.save(token);

        // Send email
        try {
            emailService.sendPasswordResetEmail(user.getEmail(), user.getFirstName(), tokenString);
            logger.info("✅ Password reset email sent to: {}", email);
        } catch (Exception e) {
            logger.error("❌ Failed to send reset email to: {}", email, e);
            // Don't throw exception - token is still valid if email fails
        }
    }

    /**
     * Validate password reset token
     */
    public User validateResetToken(String tokenString) {
        logger.info("🔍 Validating password reset token");

        // Find token
        PasswordResetToken token = tokenRepository.findByToken(tokenString)
                .orElseThrow(() -> {
                    logger.error("❌ Invalid password reset token");
                    return new BadRequestException("Invalid password reset token");
                });

        // Check if already used
        if (token.isUsed()) {
            logger.warn("⚠️ Password reset token already used");
            throw new BadRequestException("This password reset link has already been used");
        }

        // Check if expired
        if (token.isExpired()) {
            logger.error("❌ Password reset token expired");
            throw new BadRequestException("Password reset link has expired. Please request a new one.");
        }

        logger.info("✅ Token validated successfully");
        return token.getUser();
    }

    /**
     * Reset password with token
     */
    @Transactional
    public void resetPassword(String tokenString, String newPassword, String confirmPassword) {
        logger.info("🔐 Resetting password");

        // Validate passwords match
        if (!newPassword.equals(confirmPassword)) {
            throw new BadRequestException("Passwords do not match");
        }

        // Validate token and get user
        User user = validateResetToken(tokenString);

        // Find and mark token as used
        PasswordResetToken token = tokenRepository.findByToken(tokenString)
                .orElseThrow(() -> new BadRequestException("Invalid token"));

        token.markAsUsed();
        tokenRepository.save(token);

        // Update user password
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);

        // Invalidate all other reset tokens for this user
        tokenRepository.invalidateAllTokensForUser(user, LocalDateTime.now());

        logger.info("✅ Password reset successfully for user: {}", user.getEmail());

        // Send confirmation email
        try {
            emailService.sendPasswordChangedConfirmation(user.getEmail(), user.getFirstName());
        } catch (Exception e) {
            logger.error("❌ Failed to send confirmation email", e);
            // Don't throw - password was changed successfully
        }
    }

    /**
     * Cleanup expired and used tokens (scheduled job)
     */
    @Transactional
    public int cleanupTokens() {
        logger.info("🧹 Cleaning up expired and used password reset tokens");
        int deleted = tokenRepository.deleteExpiredAndUsedTokens(LocalDateTime.now());
        logger.info("✅ Deleted {} tokens", deleted);
        return deleted;
    }

    /**
     * Get client IP address from request
     */
    private String getClientIP(HttpServletRequest request) {
        String xfHeader = request.getHeader("X-Forwarded-For");
        if (xfHeader == null) {
            return request.getRemoteAddr();
        }
        return xfHeader.split(",")[0];
    }
}