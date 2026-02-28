package com.edumind.lms.modules.ai.repository;

import com.edumind.lms.modules.ai.entity.AiJobLog;
import com.edumind.lms.modules.ai.enums.AiJobStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;

public interface AiJobLogRepository extends JpaRepository<AiJobLog, Long> {

    List<AiJobLog> findByStatusAndNextRetryAtBefore(AiJobStatus status, LocalDateTime before);
}
