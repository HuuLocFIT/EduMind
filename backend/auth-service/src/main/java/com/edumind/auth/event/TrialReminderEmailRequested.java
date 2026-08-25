package com.edumind.auth.event;
import java.time.LocalDateTime;
public record TrialReminderEmailRequested(String email, String name, long daysRemaining, LocalDateTime trialEndDate) {}
