package com.edumind.auth.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.util.HexFormat;
import java.util.Locale;

/**
 * Fixed one-hour, Postgres-backed limiter dedicated to verification resend requests.
 * It is a separate bean so REQUIRES_NEW is applied through a Spring proxy and an attempt
 * remains consumed even when the caller subsequently rolls back.
 * PostgreSQL computes the window id to avoid clock skew between service instances.
 */
@Component
public class EmailVerificationResendRateLimiter {
    private static final String HMAC_ALGORITHM = "HmacSHA256";
    private static final String UPSERT_SQL = """
            INSERT INTO email_verification_resend_buckets
                (email_hash, window_id, attempts, updated_at)
            VALUES (?, FLOOR(EXTRACT(EPOCH FROM CURRENT_TIMESTAMP) / 3600), 1, CURRENT_TIMESTAMP)
            ON CONFLICT (email_hash, window_id)
            DO UPDATE SET attempts = email_verification_resend_buckets.attempts + 1,
                          updated_at = CURRENT_TIMESTAMP
            RETURNING attempts
            """;

    private final JdbcTemplate jdbcTemplate;
    private final String hmacKey;

    public EmailVerificationResendRateLimiter(
            JdbcTemplate jdbcTemplate,
            @Value("${app.auth.email-verification-limiter.hmac-key}") String hmacKey) {
        this.jdbcTemplate = jdbcTemplate;
        this.hmacKey = hmacKey;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public int incrementAndGet(String emailHash) {
        Integer attempts = jdbcTemplate.queryForObject(UPSERT_SQL, Integer.class, emailHash);
        return attempts == null ? 0 : attempts;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public int cleanupOlderThan(long hours) {
        return jdbcTemplate.update(
                "DELETE FROM email_verification_resend_buckets " +
                        "WHERE window_id < FLOOR(EXTRACT(EPOCH FROM CURRENT_TIMESTAMP) / 3600) - ?",
                hours);
    }

    public String hashEmail(String email) {
        String normalized = email.trim().toLowerCase(Locale.ROOT);
        try {
            Mac mac = Mac.getInstance(HMAC_ALGORITHM);
            mac.init(new SecretKeySpec(hmacKey.getBytes(StandardCharsets.UTF_8), HMAC_ALGORITHM));
            return HexFormat.of().formatHex(mac.doFinal(normalized.getBytes(StandardCharsets.UTF_8)));
        } catch (GeneralSecurityException exception) {
            throw new IllegalStateException("Unable to hash email for rate limiting", exception);
        }
    }
}
