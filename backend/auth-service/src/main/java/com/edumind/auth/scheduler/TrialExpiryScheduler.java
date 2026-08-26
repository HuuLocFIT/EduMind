package com.edumind.auth.scheduler;

import com.edumind.auth.entity.Role; import com.edumind.auth.entity.User;
import com.edumind.auth.enums.RoleName; import com.edumind.auth.repository.RoleRepository; import com.edumind.auth.repository.UserRepository;
import com.edumind.auth.service.TrialTransitionService;
import org.slf4j.Logger; import org.slf4j.LoggerFactory; import org.springframework.scheduling.annotation.Scheduled; import org.springframework.stereotype.Component;
import java.time.LocalDateTime; import java.time.temporal.ChronoUnit; import java.util.List;

@Component
public class TrialExpiryScheduler {
    private static final Logger log=LoggerFactory.getLogger(TrialExpiryScheduler.class); private static final int REMINDER_DAYS=7;
    private final UserRepository users; private final RoleRepository roles; private final TrialTransitionService transitions;
    public TrialExpiryScheduler(UserRepository users,RoleRepository roles,TrialTransitionService transitions){this.users=users;this.roles=roles;this.transitions=transitions;}
    @Scheduled(cron="0 0 0 * * *")
    public void checkExpiringTrials(){
        LocalDateTime now=LocalDateTime.now(); Role trial=roles.findByName(RoleName.ROLE_TEACHER_TRIAL).orElse(null); if(trial==null){log.warn("TEACHER_TRIAL role not found");return;}
        List<User> candidates=users.findByRolesContaining(trial); int reminders=0,expired=0;
        for(User user:candidates){
            try{
                if(user.getTrialEndDate()==null)continue;
                long days=ChronoUnit.DAYS.between(now,user.getTrialEndDate());
                if(days<=0){if(transitions.claimAndExpireTrial(user.getId(),now))expired++;}
                else if(days<=REMINDER_DAYS){if(transitions.claimAndRemindTrial(user.getId(),days,now))reminders++;}
            }catch(Exception ex){log.error("Failed to transition trial for user id {}",user.getId(),ex);}
        }
        log.info("Trial check completed: {} reminders, {} expiries",reminders,expired);
    }
}
