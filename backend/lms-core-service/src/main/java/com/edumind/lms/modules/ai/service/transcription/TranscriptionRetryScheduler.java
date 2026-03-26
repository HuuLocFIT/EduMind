package com.edumind.lms.modules.ai.service.transcription;

import com.edumind.lms.modules.ai.entity.AiJobLog;
import com.edumind.lms.modules.ai.enums.AiJobStatus;
import com.edumind.lms.modules.ai.repository.AiJobLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.task.TaskRejectedException;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class TranscriptionRetryScheduler {

    private final AiJobLogRepository jobLogRepository;
    private final WhisperTranscriptionService transcriptionService;

    @Scheduled(fixedDelay = 30_000)
    @Transactional
    public void retryDelayedJobs() {
        List<AiJobLog> delayedJobs = jobLogRepository
                .findByStatusAndNextRetryAtBefore(AiJobStatus.DELAYED, LocalDateTime.now());

        if (delayedJobs.isEmpty()) {
            return;
        }

        for (AiJobLog job : delayedJobs) {
            try {
                String rawMetadata = job.getMetadata();
                if (rawMetadata == null || rawMetadata.isBlank()) {
                    job.setStatus(AiJobStatus.FAILED);
                    job.setCompletedAt(LocalDateTime.now());
                    job.setErrorMessage("Missing metadata.videoUrl for retry");
                    jobLogRepository.save(job);
                    continue;
                }

                // Metadata format: "<language>|<videoUrl>" (new) or just "<videoUrl>" (legacy).
                String videoUrl;
                String language;
                int pipeIdx = rawMetadata.indexOf('|');
                if (pipeIdx > 0 && pipeIdx < rawMetadata.length() - 1) {
                    language = rawMetadata.substring(0, pipeIdx);
                    videoUrl = rawMetadata.substring(pipeIdx + 1);
                } else {
                    // Legacy format: only the URL was stored
                    videoUrl = rawMetadata;
                    language = "en";
                }

                // Move back to PENDING before re-queueing
                job.setStatus(AiJobStatus.PENDING);
                job.setNextRetryAt(null);
                jobLogRepository.save(job);

                transcriptionService.processTranscriptionAsync(job.getId(), job.getReferenceId(), videoUrl, language);
                log.info("Re-queued transcription job {}", job.getId());

            } catch (TaskRejectedException e) {
                // Executor queue full: keep it delayed and try again later
                job.setStatus(AiJobStatus.DELAYED);
                job.setNextRetryAt(LocalDateTime.now().plusSeconds(30));
                job.setErrorMessage("Retry queue full: " + e.getMessage());
                jobLogRepository.save(job);
                log.warn("Retry queue full for job {} — keeping DELAYED", job.getId());
            } catch (Exception e) {
                job.setStatus(AiJobStatus.FAILED);
                job.setCompletedAt(LocalDateTime.now());
                job.setErrorMessage("Retry failed: " + e.getMessage());
                jobLogRepository.save(job);
                log.error("Retry failed for job {}: {}", job.getId(), e.getMessage(), e);
            }
        }
    }
}

