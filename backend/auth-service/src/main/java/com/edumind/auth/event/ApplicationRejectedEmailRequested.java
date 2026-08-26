package com.edumind.auth.event;
public record ApplicationRejectedEmailRequested(String email, String name, String reason) {}
