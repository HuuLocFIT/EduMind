package com.edumind.lms.modules.ai.repository;

import com.edumind.lms.modules.ai.entity.AiRateLimit;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AiRateLimitRepository extends JpaRepository<AiRateLimit, Long> {
}

