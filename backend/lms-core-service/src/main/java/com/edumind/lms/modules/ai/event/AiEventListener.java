package com.edumind.lms.modules.ai.event;

import com.edumind.lms.modules.ai.service.AiSummaryService;
import com.edumind.lms.modules.ai.service.EmbeddingService;
import com.edumind.lms.modules.course.event.LessonContentUpdatedEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Slf4j
@Component
@RequiredArgsConstructor
public class AiEventListener {

    private final AiSummaryService aiSummaryService;
    private final EmbeddingService embeddingService;

    @Async("taskExecutor")
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onLessonContentUpdated(LessonContentUpdatedEvent event) {
        var lesson = event.getLesson();

        if (lesson.getArticleContent() == null || lesson.getArticleContent().isBlank()) {
            log.debug("Skipping AI processing — lesson {} has no articleContent", lesson.getId());
            return;
        }

        log.info("Triggering AI processing (summary + embeddings) for lesson {}", lesson.getId());
        try {
            aiSummaryService.requestSummaryGeneration(lesson);
            embeddingService.requestEmbedding(lesson);
        } catch (Exception e) {
            log.error("Failed to trigger AI processing for lesson {}: {}", lesson.getId(), e.getMessage(), e);
        }
    }
}

