package com.edumind.lms.modules.ai.service;

import com.edumind.lms.modules.ai.dto.response.AiJobResponse;
import com.edumind.lms.modules.ai.entity.AiJobLog;
import com.edumind.lms.modules.ai.enums.AiJobStatus;
import com.edumind.lms.modules.ai.enums.AiJobType;
import com.edumind.lms.modules.ai.repository.AiJobLogRepository;
import com.edumind.lms.shared.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class AiJobService {

    private final AiJobLogRepository aiJobLogRepository;

    @Transactional(readOnly = true)
    public AiJobResponse getJobStatus(Long jobId) {
        AiJobLog job = aiJobLogRepository.findById(jobId)
                .orElseThrow(() -> new ResourceNotFoundException("AI job not found: " + jobId));

        return toResponse(job);
    }

    @Transactional
    public AiJobLog createJob(AiJobType jobType, Long userId, Long referenceId) {
        AiJobLog job = AiJobLog.builder()
                .jobType(jobType)
                .status(AiJobStatus.PENDING)
                .userId(userId)
                .referenceId(referenceId)
                // createdAt and updatedAt are set by @PrePersist on AiJobLog
                .build();
        return aiJobLogRepository.save(job);
    }

    @Transactional
    public void updateStatus(Long jobId, AiJobStatus status, String errorMessage) {
        AiJobLog job = aiJobLogRepository.findById(jobId)
                .orElseThrow(() -> new ResourceNotFoundException("AI job not found: " + jobId));

        job.setStatus(status);
        job.setErrorMessage(errorMessage);
        if (status == AiJobStatus.PROCESSING && job.getStartedAt() == null) {
            job.setStartedAt(java.time.LocalDateTime.now());
        }
        if (status == AiJobStatus.COMPLETED || status == AiJobStatus.FAILED) {
            job.setCompletedAt(java.time.LocalDateTime.now());
        }
        aiJobLogRepository.save(job);
    }

    @Transactional(readOnly = true)
    public AiJobLog getJob(Long jobId) {
        return aiJobLogRepository.findById(jobId)
                .orElseThrow(() -> new ResourceNotFoundException("AI job not found: " + jobId));
    }

    private AiJobResponse toResponse(AiJobLog job) {
        return AiJobResponse.builder()
                .jobId(job.getId())
                .jobType(job.getJobType())
                .status(job.getStatus())
                .userId(job.getUserId())
                .referenceId(job.getReferenceId())
                .errorMessage(job.getErrorMessage())
                .startedAt(job.getStartedAt())
                .completedAt(job.getCompletedAt())
                .nextRetryAt(job.getNextRetryAt())
                .createdAt(job.getCreatedAt())
                .build();
    }
}
