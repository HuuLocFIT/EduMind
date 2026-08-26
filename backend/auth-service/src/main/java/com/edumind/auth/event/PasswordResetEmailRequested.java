package com.edumind.auth.event;

public record PasswordResetEmailRequested(String email, String name, String resetUrl) {
    @Override public String toString() { return "PasswordResetEmailRequested[email=***]"; }
}
