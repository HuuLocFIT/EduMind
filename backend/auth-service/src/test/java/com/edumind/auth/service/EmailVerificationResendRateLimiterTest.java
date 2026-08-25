package com.edumind.auth.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class EmailVerificationResendRateLimiterTest {
    @Mock
    private JdbcTemplate jdbcTemplate;

    @Test
    void incrementAndGetReturnsPostIncrementCount() {
        EmailVerificationResendRateLimiter limiter = limiter();
        when(jdbcTemplate.queryForObject(anyString(), eq(Integer.class), eq("hash"))).thenReturn(4);

        assertEquals(4, limiter.incrementAndGet("hash"));
    }

    @Test
    void hashEmailIsCaseAndWhitespaceInsensitive() {
        EmailVerificationResendRateLimiter limiter = limiter();

        assertEquals(limiter.hashEmail("user@example.com"),
                limiter.hashEmail("  USER@EXAMPLE.COM "));
    }

    @Test
    void cleanupUsesFixedPostgresWindow() {
        EmailVerificationResendRateLimiter limiter = limiter();
        when(jdbcTemplate.update(anyString(), eq(24L))).thenReturn(2);

        assertEquals(2, limiter.cleanupOlderThan(24));
        verify(jdbcTemplate).update(anyString(), eq(24L));
    }

    private EmailVerificationResendRateLimiter limiter() {
        return new EmailVerificationResendRateLimiter(jdbcTemplate,
                "test-email-verification-limiter-key-at-least-32-bytes");
    }
}
