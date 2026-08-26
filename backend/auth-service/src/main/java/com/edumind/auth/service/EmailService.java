package com.edumind.auth.service;

import com.edumind.auth.event.*;
import com.edumind.auth.entity.User;
import com.edumind.common.exception.EmailSendException;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;

import java.time.Year;
import java.time.format.DateTimeFormatter;

@Service
public class EmailService {
    private static final Logger log = LoggerFactory.getLogger(EmailService.class);
    private static final DateTimeFormatter DATE = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private final JavaMailSender mailSender;
    private final TemplateEngine htmlEngine;
    private final TemplateEngine textEngine;
    @Value("${mail.from}") private String fromEmail;
    @Value("${mail.enabled:true}") private boolean emailEnabled;
    @Value("${app.frontend.url:http://localhost:3000}") private String frontendUrl;
    @Value("${app.support.email:supportedumind2026@gmail.com}") private String supportEmail;

    public EmailService(JavaMailSender mailSender, TemplateEngine templateEngine,
                        @Qualifier("textTemplateEngine") TemplateEngine textEngine) {
        this.mailSender = mailSender; this.htmlEngine = templateEngine; this.textEngine = textEngine;
    }
    public void sendVerificationEmail(VerificationEmailRequested e) { Context c=base(e.name()); c.setVariable("actionUrl",e.verificationUrl()); send(e.email(),e.welcome()?"Welcome to EduMind - Verify Your Email":"Verify Your Email - EduMind",e.welcome()?"welcome-verification":"email-verification",c); }
    public void sendPasswordResetEmail(PasswordResetEmailRequested e) { Context c=base(e.name()); c.setVariable("actionUrl",e.resetUrl()); send(e.email(),"Reset Your Password - EduMind","password-reset",c); }
    public void sendPasswordChangedEmail(PasswordChangedEmailRequested e) { send(e.email(),"Your Password Has Been Changed - EduMind","password-changed",base(e.name())); }
    public void sendApplicationApprovedEmail(ApplicationApprovedEmailRequested e) { Context c=base(e.name()); c.setVariable("isTrial",e.trial()); c.setVariable("trialEndDate",e.trialEndDate()==null?"":DATE.format(e.trialEndDate())); c.setVariable("actionUrl",frontendUrl+"/teacher/dashboard"); send(e.email(),e.trial()?"Teacher Trial Account Approved":"Teacher Account Approved","application-approved",c); }
    public void sendApplicationRejectedEmail(ApplicationRejectedEmailRequested e) { Context c=base(e.name()); c.setVariable("reason",e.reason()); c.setVariable("actionUrl",frontendUrl+"/teacher/application"); send(e.email(),"Teacher Application Update","application-rejected",c); }
    public void sendApplicationReceivedEmail(ApplicationReceivedEmailRequested e) { Context c=base(e.name()); c.setVariable("subject",e.subject()); c.setVariable("experienceYears",e.experienceYears()); c.setVariable("actionUrl",e.statusUrl()); send(e.email(),"We Received Your Teacher Application","application-received",c); }
    public void sendTrialReminderEmail(TrialReminderEmailRequested e) { Context c=base(e.name()); c.setVariable("daysRemaining",e.daysRemaining()); c.setVariable("trialEndDate",DATE.format(e.trialEndDate())); c.setVariable("actionUrl","mailto:"+supportEmail); send(e.email(),"Teacher Trial Expiring in "+e.daysRemaining()+" Days","trial-expiry-reminder",c); }
    public void sendTrialExpiredEmail(TrialExpiredEmailRequested e) { Context c=base(e.name()); c.setVariable("actionUrl","mailto:"+supportEmail); send(e.email(),"Your Teacher Trial Has Ended","trial-expired",c); }
    public void sendAccountDeletedEmail(AccountDeletedEmailRequested e) { send(e.email(),"Your EduMind Account Was Deactivated","account-deletion",base(e.name())); }

    /** Compatibility adapters for older callers; transactional services publish events instead. */
    @Deprecated public void sendPasswordResetEmail(String email,String name,String token){sendPasswordResetEmail(new PasswordResetEmailRequested(email,name,frontendUrl+"/reset-password?token="+token));}
    @Deprecated public void sendPasswordChangedConfirmation(String email,String name){sendPasswordChangedEmail(new PasswordChangedEmailRequested(email,name));}
    @Deprecated public void sendApplicationApprovedEmail(User user,boolean trial,java.time.LocalDateTime end){sendApplicationApprovedEmail(new ApplicationApprovedEmailRequested(user.getEmail(),user.getUsername(),trial,end));}
    @Deprecated public void sendApplicationRejectedEmail(User user,String reason){sendApplicationRejectedEmail(new ApplicationRejectedEmailRequested(user.getEmail(),user.getUsername(),reason));}

    private Context base(String name) { Context c=new Context(); c.setVariable("name",name); c.setVariable("frontendUrl",frontendUrl); c.setVariable("supportEmail",supportEmail); c.setVariable("year",Year.now().getValue()); return c; }
    private void send(String to,String subject,String template,Context context) {
        if(!emailEnabled){ log.info("Email disabled; skipping {}",template); return; }
        try { String html=htmlEngine.process("email/"+template,context); String plain=textEngine.process(template,context); MimeMessage message=mailSender.createMimeMessage(); MimeMessageHelper helper=new MimeMessageHelper(message,true,"UTF-8"); helper.setFrom(fromEmail); helper.setReplyTo(supportEmail); helper.setTo(to); helper.setSubject(subject); helper.setText(plain,html); mailSender.send(message); }
        catch(MessagingException|RuntimeException ex){ throw new EmailSendException("Failed to send email",ex); }
    }
}
