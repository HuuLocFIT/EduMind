package com.edumind.auth.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.InvalidKeyException;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.Locale;

/**
 * Fixed-window (1 hour), Postgres-backed rate limiter for password reset requests.
 *
 * <p>This is a dedicated Spring bean - NOT a method on {@code PasswordResetService} - for two
 * reasons:
 * <ol>
 *     <li>{@link #incrementAndGet(String)} must run in its OWN transaction
 *         ({@code REQUIRES_NEW}), independent of the caller's transaction. If the caller's
 *         transaction is later rolled back (e.g. the request is rejected for some other reason
 *         after the increment), the increment must still be committed - otherwise a
 *         rejected/hammering client would never actually consume a slot.</li>
 *     <li>Spring's {@code @Transactional} proxy is bypassed on self-invocation (calling a method
 *         on {@code this} from within the same class silently no-ops the annotation). Being a
 *         separate bean guarantees the call goes through the Spring proxy and the
 *         {@code REQUIRES_NEW} propagation actually takes effect.</li>
 * </ol>
 *
 * <p>The window id is computed by PostgreSQL itself ({@code FLOOR(EXTRACT(EPOCH FROM
 * CURRENT_TIMESTAMP) / 3600)}), not by the application, to avoid clock skew across instances.
 */
@Component
public class PasswordResetRateLimiter {

    private static final Logger logger = LoggerFactory.getLogger(PasswordResetRateLimiter.class);

    private static final String HMAC_ALGORITHM = "HmacSHA256";

    private static final String UPSERT_SQL = """
            INSERT INTO password_reset_buckets (email_hash, window_id, attempts, updated_at)
            VALUES (?, FLOOR(EXTRACT(EPOCH FROM CURRENT_TIMESTAMP) / 3600), 1, CURRENT_TIMESTAMP)
            ON CONFLICT (email_hash, window_id)
            DO UPDATE SET attempts = password_reset_buckets.attempts + 1,
                          updated_at = CURRENT_TIMESTAMP
            RETURNING attempts
            """;

    private final JdbcTemplate jdbcTemplate;

    private final String hmacKey;

    public PasswordResetRateLimiter(
            JdbcTemplate jdbcTemplate,
            @Value("${app.auth.password-reset-limiter.hmac-key}") String hmacKey) {
        this.jdbcTemplate = jdbcTemplate;
        this.hmacKey = hmacKey;
    }

    /**
     * Atomically increments the attempt counter for the current 1-hour window and returns the
     * new count. Runs in its own transaction so the increment is durable even if the caller's
     * transaction subsequently rolls back or the request is ultimately rejected.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public int incrementAndGet(String emailHash) {
        Integer attempts = jdbcTemplate.queryForObject(UPSERT_SQL, Integer.class, emailHash);
        return attempts != null ? attempts : 0;
    }

    /**
     * Deletes bucket rows older than the given number of hours. Used by the nightly cleanup job.
     *
     * @return number of rows deleted
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public int cleanupOlderThan(long hours) {
        return jdbcTemplate.update(
                "DELETE FROM password_reset_buckets "
                        + "WHERE window_id < FLOOR(EXTRACT(EPOCH FROM CURRENT_TIMESTAMP) / 3600) - ?",
                hours);
    }

    /**
     * Hashes an email into a stable, non-reversible key for the rate-limit bucket.
     *
     * <p>Normalizes with {@code trim().toLowerCase(Locale.ROOT)} - this is INTENTIONALLY
     * case-insensitive, unlike {@code UserRepository.findByEmail} (a case-sensitive derived
     * query). That divergence is deliberate and strictly stricter: it prevents an attacker from
     * bypassing the limiter by varying the case of an otherwise-identical mailbox.
     *
     * <p>Uses HMAC-SHA-256 with a dedicated secret (never plain SHA-256/unsalted hashing) because
     * email address entropy is low enough to dictionary-attack an unsalted hash quickly.
     */
    public String hashEmail(String email) {
        String normalized = email.trim().toLowerCase(Locale.ROOT);
        try {
            Mac mac = Mac.getInstance(HMAC_ALGORITHM);
            mac.init(new SecretKeySpec(hmacKey.getBytes(StandardCharsets.UTF_8), HMAC_ALGORITHM));
            byte[] digest = mac.doFinal(normalized.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException | InvalidKeyException e) {
            // Should never happen - HmacSHA256 is a standard JDK algorithm and the key is
            // always non-empty (validated via required config property).
            logger.error("❌ Failed to compute HMAC for password reset rate limiter", e);
            throw new IllegalStateException("Unable to hash email for rate limiting", e);
        }
    }
}
