package com.edumind.auth.event;
import java.time.LocalDateTime;
public record ApplicationApprovedEmailRequested(String email, String name, boolean trial, LocalDateTime trialEndDate) {}
