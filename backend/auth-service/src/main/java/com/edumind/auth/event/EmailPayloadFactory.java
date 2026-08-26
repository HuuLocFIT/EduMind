package com.edumind.auth.event;

import com.edumind.auth.entity.User;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class EmailPayloadFactory {
    @Value("${app.frontend.url:http://localhost:3000}") private String frontendUrl;

    public String displayName(User user) {
        String first = trim(user.getFirstName());
        String last = trim(user.getLastName());
        String full = (first + " " + last).trim();
        if (!full.isEmpty()) return full;
        String username = trim(user.getUsername());
        return username.isEmpty() ? "User" : username;
    }

    public VerificationEmailRequested verification(User user, String token, boolean welcome) {
        return new VerificationEmailRequested(user.getEmail(), displayName(user), frontendUrl + "/verify-email?token=" + token, welcome);
    }

    public PasswordResetEmailRequested passwordReset(User user, String token) {
        return new PasswordResetEmailRequested(user.getEmail(), displayName(user), frontendUrl + "/reset-password?token=" + token);
    }

    private String trim(String value) { return value == null ? "" : value.trim(); }
}
