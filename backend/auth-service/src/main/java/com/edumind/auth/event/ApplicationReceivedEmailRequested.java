package com.edumind.auth.event;
public record ApplicationReceivedEmailRequested(String email, String name, String subject, Integer experienceYears, String statusUrl) {}
