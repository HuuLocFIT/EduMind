package com.edumind.lms.modules.ai.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class ReindexScheduler {

    private final EmbeddingService embeddingService;
    private final AiSummaryService aiSummaryService;

    /**
     * Continues any in-progress reindex operation after queue capacity was exhausted.
     * Each run skips already-indexed lessons (via findAllIndexedLessonIds), so this
     * is a no-op once all lessons are indexed.
     */
    @Scheduled(fixedDelay = 120_000)
    public void continueReindex() {
        int embeddings = embeddingService.reindexAll();
        int summaries = aiSummaryService.reindexAll();
        if (embeddings > 0 || summaries > 0) {
            log.info("Reindex continuation: queued {} embedding jobs, {} summary jobs", embeddings, summaries);
        }
    }
}
