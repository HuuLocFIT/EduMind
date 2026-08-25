package com.edumind.auth.event;

import com.edumind.auth.service.EmailService;
import org.slf4j.Logger; import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async; import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase; import org.springframework.transaction.event.TransactionalEventListener;

@Component
public class EmailEventListener {
    private static final Logger log=LoggerFactory.getLogger(EmailEventListener.class); private final EmailService emailService;
    public EmailEventListener(EmailService emailService){this.emailService=emailService;}
    @Async("emailExecutor") @TransactionalEventListener(phase=TransactionPhase.AFTER_COMMIT) public void on(VerificationEmailRequested e){safe("verification",()->emailService.sendVerificationEmail(e));}
    @Async("emailExecutor") @TransactionalEventListener(phase=TransactionPhase.AFTER_COMMIT) public void on(PasswordResetEmailRequested e){safe("password reset",()->emailService.sendPasswordResetEmail(e));}
    @Async("emailExecutor") @TransactionalEventListener(phase=TransactionPhase.AFTER_COMMIT) public void on(PasswordChangedEmailRequested e){safe("password changed",()->emailService.sendPasswordChangedEmail(e));}
    @Async("emailExecutor") @TransactionalEventListener(phase=TransactionPhase.AFTER_COMMIT) public void on(ApplicationApprovedEmailRequested e){safe("application approved",()->emailService.sendApplicationApprovedEmail(e));}
    @Async("emailExecutor") @TransactionalEventListener(phase=TransactionPhase.AFTER_COMMIT) public void on(ApplicationRejectedEmailRequested e){safe("application rejected",()->emailService.sendApplicationRejectedEmail(e));}
    @Async("emailExecutor") @TransactionalEventListener(phase=TransactionPhase.AFTER_COMMIT) public void on(ApplicationReceivedEmailRequested e){safe("application received",()->emailService.sendApplicationReceivedEmail(e));}
    @Async("emailExecutor") @TransactionalEventListener(phase=TransactionPhase.AFTER_COMMIT) public void on(TrialReminderEmailRequested e){safe("trial reminder",()->emailService.sendTrialReminderEmail(e));}
    @Async("emailExecutor") @TransactionalEventListener(phase=TransactionPhase.AFTER_COMMIT) public void on(TrialExpiredEmailRequested e){safe("trial expired",()->emailService.sendTrialExpiredEmail(e));}
    @Async("emailExecutor") @TransactionalEventListener(phase=TransactionPhase.AFTER_COMMIT) public void on(AccountDeletedEmailRequested e){safe("account deleted",()->emailService.sendAccountDeletedEmail(e));}
    private void safe(String kind,Runnable send){try{send.run();}catch(Exception ex){log.error("Best-effort {} email failed after commit",kind,ex);}}
}
