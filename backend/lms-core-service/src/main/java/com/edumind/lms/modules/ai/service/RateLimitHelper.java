package com.edumind.lms.modules.ai.service;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Component
@RequiredArgsConstructor
public class RateLimitHelper {

    private final JdbcTemplate jdbcTemplate;

    private static final String UPSERT_SQL = """
            INSERT INTO ai.ai_rate_limits (user_id, limit_date, message_count, updated_at)
            VALUES (?, CURRENT_DATE, 1, NOW())
            ON CONFLICT (user_id, limit_date) DO UPDATE
            SET message_count = ai_rate_limits.message_count + 1,
                updated_at = NOW()
            RETURNING message_count
            """;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public int incrementAndGet(Long userId) {
        Integer count = jdbcTemplate.queryForObject(UPSERT_SQL, Integer.class, userId);
        return count != null ? count : 0;
    }
}

