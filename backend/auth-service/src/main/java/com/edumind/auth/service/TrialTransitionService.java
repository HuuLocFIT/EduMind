package com.edumind.auth.service;

import com.edumind.auth.entity.Role;
import com.edumind.auth.entity.User;
import com.edumind.auth.enums.RoleName;
import com.edumind.auth.event.EmailPayloadFactory;
import com.edumind.auth.event.TrialExpiredEmailRequested;
import com.edumind.auth.event.TrialReminderEmailRequested;
import com.edumind.auth.repository.RoleRepository;
import com.edumind.auth.repository.UserRepository;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

@Service
public class TrialTransitionService {
    private final UserRepository users; private final RoleRepository roles;
    private final ApplicationEventPublisher publisher; private final EmailPayloadFactory payloads;
    public TrialTransitionService(UserRepository users,RoleRepository roles,ApplicationEventPublisher publisher,EmailPayloadFactory payloads){this.users=users;this.roles=roles;this.publisher=publisher;this.payloads=payloads;}

    @Transactional
    public boolean claimAndRemindTrial(Long userId,long daysRemaining,LocalDateTime now){
        if(users.claimTrialReminder(userId,now)!=1)return false;
        User user=users.findById(userId).orElseThrow();
        publisher.publishEvent(new TrialReminderEmailRequested(user.getEmail(),payloads.displayName(user),daysRemaining,user.getTrialEndDate()));
        return true;
    }

    @Transactional
    public boolean claimAndExpireTrial(Long userId,LocalDateTime now){
        if(users.claimTrialExpiry(userId,now)!=1)return false;
        User user=users.findById(userId).orElseThrow();
        Role trial=roles.findByName(RoleName.ROLE_TEACHER_TRIAL).orElseThrow();
        Role student=roles.findByName(RoleName.ROLE_STUDENT).orElseThrow();
        Set<Role> updated=new HashSet<>(user.getRoles()); updated.remove(trial); updated.add(student); user.setRoles(updated); users.save(user);
        publisher.publishEvent(new TrialExpiredEmailRequested(user.getEmail(),payloads.displayName(user)));
        return true;
    }
}
