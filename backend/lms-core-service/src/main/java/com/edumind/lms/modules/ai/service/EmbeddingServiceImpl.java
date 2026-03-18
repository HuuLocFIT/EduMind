package com.edumind.lms.modules.ai.service;

import com.edumind.lms.modules.ai.entity.AiJobLog;
import com.edumind.lms.modules.ai.enums.AiJobType;
import com.edumind.lms.modules.course.api.LessonQueryService;
import com.edumind.lms.modules.course.api.dto.LessonInfo;
import com.edumind.lms.modules.course.entity.Lesson;
import com.edumind.lms.shared.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class EmbeddingServiceImpl implements EmbeddingService {

    private final AiJobService aiJobService;
    private final AsyncEmbeddingProcessor asyncEmbeddingProcessor;
    private final LessonQueryService lessonQueryService;

    @Autowired
    @Qualifier("aiTaskExecutor")
    private ThreadPoolTaskExecutor aiTaskExecutor;

    @Override
    @Transactional
    public void requestEmbedding(Lesson lesson) {
        if (lesson.getArticleContent() == null || lesson.getArticleContent().isBlank()) {
            log.debug("Skipping embedding generation — lesson {} has no articleContent", lesson.getId());
            return;
        }

        LessonInfo info = lessonQueryService.getLessonInfo(lesson.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Lesson not found: " + lesson.getId()));

        Long systemUserId = 0L;

        AiJobLog job = aiJobService.createJob(
                AiJobType.EMBEDDING,
                systemUserId,
                lesson.getId()
        );

        asyncEmbeddingProcessor.process(
                job.getId(),
                lesson.getId(),
                info.courseId(),
                lesson.getArticleContent()
        );
    }

    @Override
    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    public int reindexAll() {
        List<LessonInfo> lessons = lessonQueryService.findAllWithArticleContent();

        log.info("Backfilling embeddings for {} lessons with article content", lessons.size());
        int queued = 0;
        for (LessonInfo info : lessons) {
            if (aiTaskExecutor.getThreadPoolExecutor().getQueue().remainingCapacity() == 0) {
                log.warn("aiTaskExecutor queue full — stopping embedding reindex at {}/{} lessons", queued, lessons.size());
                break;
            }
            try {
                AiJobLog job = aiJobService.createJob(AiJobType.EMBEDDING, 0L, info.id());
                asyncEmbeddingProcessor.process(job.getId(), info.id(), info.courseId(), info.articleContent());
                queued++;
            } catch (Exception e) {
                log.error("Failed to queue embedding for lesson {}: {}", info.id(), e.getMessage());
            }
        }
        return queued;
    }
}
