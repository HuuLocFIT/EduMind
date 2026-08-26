package com.edumind.auth.event;

public record VerificationEmailRequested(String email, String name, String verificationUrl, boolean welcome) {
    @Override public String toString() { return "VerificationEmailRequested[email=***]"; }
}
