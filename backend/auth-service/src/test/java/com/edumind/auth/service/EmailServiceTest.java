package com.edumind.auth.service;

import com.edumind.auth.event.*;
import jakarta.mail.BodyPart;
import jakarta.mail.Message;
import jakarta.mail.Multipart;
import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.util.ReflectionTestUtils;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.IContext;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Properties;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class EmailServiceTest {
    @Mock private JavaMailSender mailSender;
    @Mock private TemplateEngine htmlEngine;
    @Mock private TemplateEngine textEngine;

    private EmailService emailService;

    @BeforeEach
    void setUp() {
        emailService = new EmailService(mailSender, htmlEngine, textEngine);
        ReflectionTestUtils.setField(emailService, "fromEmail", "noreply@edumind.com");
        ReflectionTestUtils.setField(emailService, "supportEmail", "supportedumind2026@gmail.com");
        ReflectionTestUtils.setField(emailService, "frontendUrl", "https://app.example.test");
        ReflectionTestUtils.setField(emailService, "emailEnabled", true);
        lenient().when(mailSender.createMimeMessage()).thenAnswer(invocation ->
                new MimeMessage(Session.getInstance(new Properties())));
        lenient().when(htmlEngine.process(anyString(), any(IContext.class))).thenReturn("<html><body>HTML body</body></html>");
        lenient().when(textEngine.process(anyString(), any(IContext.class))).thenReturn("Plain text body");
    }

    @Test
    @DisplayName("Verification mail has production subject, Reply-To and multipart alternatives")
    void verificationMessageHasExpectedHeadersAndBodies() throws Exception {
        emailService.sendVerificationEmail(new VerificationEmailRequested(
                "learner@example.test", "Learner", "https://app.example.test/verify-email?token=secret", false));

        ArgumentCaptor<MimeMessage> captor = ArgumentCaptor.forClass(MimeMessage.class);
        verify(mailSender).send(captor.capture());
        MimeMessage message = captor.getValue();
        message.saveChanges();

        assertEquals("Verify Your Email - EduMind", message.getSubject());
        assertEquals("learner@example.test", message.getRecipients(Message.RecipientType.TO)[0].toString());
        assertEquals("supportedumind2026@gmail.com", message.getReplyTo()[0].toString());
        assertTrue(message.getContentType().toLowerCase().startsWith("multipart/"));
        assertTrue(containsMimeType(message.getContent(), "text/plain"));
        assertTrue(containsMimeType(message.getContent(), "text/html"));
    }

    @Test
    @DisplayName("All ten public email operations send exactly one message")
    void allOperationsSendOneMessageEach() {
        sendAllOperations();
        verify(mailSender, times(10)).send(any(MimeMessage.class));
    }

    @Test
    @DisplayName("mail.enabled=false skips every public email operation")
    void disabledMailSkipsAllOperations() {
        ReflectionTestUtils.setField(emailService, "emailEnabled", false);
        sendAllOperations();
        verify(mailSender, never()).createMimeMessage();
        verify(mailSender, never()).send(any(MimeMessage.class));
        verifyNoInteractions(htmlEngine, textEngine);
    }

    @Test
    @DisplayName("Subjects remain professional and contain no emoji")
    void subjectsContainNoEmoji() throws Exception {
        sendAllOperations();
        ArgumentCaptor<MimeMessage> captor = ArgumentCaptor.forClass(MimeMessage.class);
        verify(mailSender, times(10)).send(captor.capture());
        for (MimeMessage message : captor.getAllValues()) {
            assertFalse(message.getSubject().matches(".*[\\x{1F300}-\\x{1FAFF}].*"), message.getSubject());
        }
    }

    private void sendAllOperations() {
        LocalDateTime trialEnd = LocalDateTime.of(2026, 8, 31, 0, 0);
        emailService.sendVerificationEmail(new VerificationEmailRequested("a@example.test", "A", "https://app.example.test/verify", true));
        emailService.sendPasswordResetEmail(new PasswordResetEmailRequested("a@example.test", "A", "https://app.example.test/reset"));
        emailService.sendPasswordChangedEmail(new PasswordChangedEmailRequested("a@example.test", "A"));
        emailService.sendApplicationReceivedEmail(new ApplicationReceivedEmailRequested("a@example.test", "A", "Java", 3, "https://app.example.test/status"));
        emailService.sendApplicationApprovedEmail(new ApplicationApprovedEmailRequested("a@example.test", "A", true, trialEnd));
        emailService.sendApplicationRejectedEmail(new ApplicationRejectedEmailRequested("a@example.test", "A", "More evidence required"));
        emailService.sendTrialReminderEmail(new TrialReminderEmailRequested("a@example.test", "A", 5, trialEnd));
        emailService.sendTrialExpiredEmail(new TrialExpiredEmailRequested("a@example.test", "A"));
        emailService.sendAccountDeletedEmail(new AccountDeletedEmailRequested("a@example.test", "A"));
        emailService.sendVerificationEmail(new VerificationEmailRequested("a@example.test", "A", "https://app.example.test/verify", false));
    }

    private boolean containsMimeType(Object content, String mimeType) throws Exception {
        if (!(content instanceof Multipart multipart)) return false;
        for (int index = 0; index < multipart.getCount(); index++) {
            BodyPart part = multipart.getBodyPart(index);
            if (part.isMimeType(mimeType)) return true;
            Object nested = part.getContent();
            if (nested instanceof Multipart && containsMimeType(nested, mimeType)) return true;
        }
        return false;
    }
}
