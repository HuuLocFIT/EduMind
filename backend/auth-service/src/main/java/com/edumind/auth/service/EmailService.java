package com.edumind.auth.service;

import com.edumind.auth.entity.User;
import com.edumind.common.exception.EmailSendException;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

@Service
public class EmailService {
    private static final Logger logger = LoggerFactory.getLogger(EmailService.class);

    @Autowired
    private JavaMailSender mailSender;

    @Autowired
    private TemplateEngine templateEngine;

    @Value("${mail.from}")
    private String fromEmail;

    @Value("${mail.enabled:true}")
    private boolean emailEnabled;

    @Value("${app.frontend.url:http://localhost:3000}")
    private String frontendUrl;

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

    public void sendWelcomeAndVerificationEmail(String toEmail, String firstName, String token) {
        logger.info("📧 Sending welcome + verification email to: {}", toEmail);

        try {
            Context context = new Context();
            context.setVariable("firstName", firstName);
            context.setVariable("verificationLink", frontendUrl + "/verify-email?token=" + token);
            context.setVariable("frontendUrl", frontendUrl);

            // Use combined template
            String htmlContent = templateEngine.process("email/welcome-verification", context);

            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromEmail);
            helper.setTo(toEmail);
            helper.setSubject("Welcome to EduMind! Please verify your email 🎉");
            helper.setText(htmlContent, true);

            mailSender.send(message);
            logger.info("✅ Welcome + verification email sent successfully to: {}", toEmail);

        } catch (MessagingException e) {
            logger.error("❌ Failed to send welcome + verification email to: {}", toEmail, e);
            throw new EmailSendException("Failed to send email", e);
        }
    }

    /**
     * Send email when teacher application is approved
     */
    public void sendApplicationApprovedEmail(User user, boolean isTrial, LocalDateTime trialEndDate) {
        if (!emailEnabled) {
            logger.info("⚠️ Email disabled - skipping approval email for: {}", user.getEmail());
            return;
        }

        try {
            Context context = new Context();
            context.setVariable("name", getDisplayName(user));
            context.setVariable("isTrial", isTrial);

            if (isTrial && trialEndDate != null) {
                DateTimeFormatter formatter = DateTimeFormatter.ofPattern("dd/MM/yyyy");
                context.setVariable("trialEndDate", trialEndDate.format(formatter));
            }

            String htmlContent = templateEngine.process("email/application-approved", context);

            sendHtmlEmail(
                    user.getEmail(),
                    isTrial ? "Teacher Trial Account Approved! 🎊" : "Teacher Account Approved! 🎓",
                    htmlContent
            );

            logger.info("✅ Application approved email sent to: {}", user.getEmail());
        } catch (Exception e) {
            logger.error("❌ Failed to send approval email to: {}", user.getEmail(), e);
        }
    }

    /**
     * Send email when teacher application is rejected
     */
    public void sendApplicationRejectedEmail(User user, String reason) {
        if (!emailEnabled) {
            logger.info("⚠️ Email disabled - skipping rejection email for: {}", user.getEmail());
            return;
        }

        try {
            Context context = new Context();
            context.setVariable("name", getDisplayName(user));
            context.setVariable("reason", reason);

            String htmlContent = templateEngine.process("email/application-rejected", context);

            sendHtmlEmail(
                    user.getEmail(),
                    "Teacher Application Update",
                    htmlContent
            );

            logger.info("✅ Application rejected email sent to: {}", user.getEmail());
        } catch (Exception e) {
            logger.error("❌ Failed to send rejection email to: {}", user.getEmail(), e);
        }
    }

    /**
     * Send reminder email when trial is about to expire
     */
    public void sendTrialExpiryReminderEmail(User user, long daysRemaining) {
        if (!emailEnabled) {
            logger.info("⚠️ Email disabled - skipping trial reminder for: {}", user.getEmail());
            return;
        }

        try {
            Context context = new Context();
            context.setVariable("name", getDisplayName(user));
            context.setVariable("daysRemaining", daysRemaining);

            String htmlContent = templateEngine.process("email/trial-expiry-reminder", context);

            sendHtmlEmail(
                    user.getEmail(),
                    String.format("Trial Expiring in %d Days! ⏰", daysRemaining),
                    htmlContent
            );

            logger.info("✅ Trial expiry reminder sent to: {} ({} days remaining)",
                    user.getEmail(), daysRemaining);
        } catch (Exception e) {
            logger.error("❌ Failed to send trial reminder to: {}", user.getEmail(), e);
        }
    }

    /**
     * Send email when trial has expired
     */
    public void sendTrialExpiredEmail(User user) {
        if (!emailEnabled) {
            logger.info("⚠️ Email disabled - skipping trial expired email for: {}", user.getEmail());
            return;
        }

        try {
            Context context = new Context();
            context.setVariable("name", getDisplayName(user));

            String htmlContent = templateEngine.process("email/trial-expired", context);

            sendHtmlEmail(
                    user.getEmail(),
                    "Trial Period Ended - Upgrade to Full Teacher Account",
                    htmlContent
            );

            logger.info("✅ Trial expired email sent to: {}", user.getEmail());
        } catch (Exception e) {
            logger.error("❌ Failed to send trial expired email to: {}", user.getEmail(), e);
        }
    }

    /**
     * Helper method to send HTML email
     */
    private void sendHtmlEmail(String to, String subject, String htmlContent) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromEmail);
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(htmlContent, true);

            mailSender.send(message);
        } catch (MessagingException e) {
            logger.error("❌ Error sending email to: {}", to, e);
            throw new EmailSendException("Failed to send email to: " + to);
        }
    }

    /**
     * Send email verification link to user
     */
    public void sendEmailVerification(String toEmail, String firstName, String token) {
        logger.info("📧 Sending email verification to: {}", toEmail);

        try {
            Context context = new Context();
            context.setVariable("firstName", firstName);
            context.setVariable("verificationLink", frontendUrl + "/verify-email?token=" + token);
            context.setVariable("frontendUrl", frontendUrl);

            String htmlContent = templateEngine.process("email/email-verification", context);

            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromEmail);
            helper.setTo(toEmail);
            helper.setSubject("Verify Your Email - EduMind");
            helper.setText(htmlContent, true);

            mailSender.send(message);
            logger.info("✅ Email verification sent successfully to: {}", toEmail);

        } catch (MessagingException e) {
            logger.error("❌ Failed to send email verification to: {}", toEmail, e);
            throw new EmailSendException("Failed to send verification email", e);
        }
    }

    /**
     * Send password reset link to user
     */
    public void sendPasswordResetEmail(String toEmail, String firstName, String token) {
        logger.info("📧 Sending password reset email to: {}", toEmail);

        try {
            Context context = new Context();
            context.setVariable("firstName", firstName);
            context.setVariable("resetLink", frontendUrl + "/reset-password?token=" + token);
            context.setVariable("frontendUrl", frontendUrl);

            String htmlContent = templateEngine.process("email/password-reset", context);

            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromEmail);
            helper.setTo(toEmail);
            helper.setSubject("Reset Your Password - EduMind");
            helper.setText(htmlContent, true);

            mailSender.send(message);
            logger.info("✅ Password reset email sent successfully to: {}", toEmail);

        } catch (MessagingException e) {
            logger.error("❌ Failed to send password reset email to: {}", toEmail, e);
            throw new EmailSendException("Failed to send password reset email", e);
        }
    }

    /**
     * Send password changed confirmation email
     */
    public void sendPasswordChangedConfirmation(String toEmail, String firstName) {
        logger.info("📧 Sending password changed confirmation to: {}", toEmail);

        try {
            Context context = new Context();
            context.setVariable("firstName", firstName);
            context.setVariable("frontendUrl", frontendUrl);

            String htmlContent = templateEngine.process("email/password-changed", context);

            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromEmail);
            helper.setTo(toEmail);
            helper.setSubject("Your Password Has Been Changed - EduMind");
            helper.setText(htmlContent, true);

            mailSender.send(message);
            logger.info("✅ Password changed confirmation sent successfully to: {}", toEmail);

        } catch (MessagingException e) {
            logger.error("❌ Failed to send password changed confirmation to: {}", toEmail, e);
            throw new EmailSendException("Failed to send password changed confirmation", e);
        }
    }
}