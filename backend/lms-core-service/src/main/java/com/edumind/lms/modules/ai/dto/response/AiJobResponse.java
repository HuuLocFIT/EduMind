package com.edumind.lms.modules.ai.dto.response;

import com.edumind.lms.modules.ai.enums.AiJobStatus;
import com.edumind.lms.modules.ai.enums.AiJobType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AiJobResponse {
    private Long jobId;
    private AiJobType jobType;
    private AiJobStatus status;
    private Long userId;
    private Long referenceId;
    private String errorMessage;
    private LocalDateTime startedAt;
    private LocalDateTime completedAt;
    private LocalDateTime nextRetryAt;
    private LocalDateTime createdAt;
}
