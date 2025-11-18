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
     * Send welcome email after successful registration
     */
    public void sendWelcomeEmail(User user) {
        if (!emailEnabled) {
            logger.info("⚠️ Email disabled - skipping welcome email for: {}", user.getEmail());
            return;
        }

        try {
            Context context = new Context();
            context.setVariable("name", getDisplayName(user));
            context.setVariable("username", user.getUsername());

            String htmlContent = templateEngine.process("email/welcome", context);

            sendHtmlEmail(
                    user.getEmail(),
                    "Welcome to EduMind! 🎉",
                    htmlContent
            );

            logger.info("✅ Welcome email sent to: {}", user.getEmail());
        } catch (Exception e) {
            logger.error("❌ Failed to send welcome email to: {}", user.getEmail(), e);
            // Don't throw exception - email failure shouldn't block registration
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
}