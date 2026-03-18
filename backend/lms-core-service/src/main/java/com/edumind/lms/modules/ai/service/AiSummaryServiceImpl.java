package com.edumind.lms.modules.ai.service;

import com.edumind.lms.modules.ai.dto.response.LessonSummaryResponse;
import com.edumind.lms.modules.ai.entity.AiJobLog;
import com.edumind.lms.modules.ai.entity.LessonSummary;
import com.edumind.lms.modules.ai.enums.AiJobStatus;
import com.edumind.lms.modules.ai.enums.AiJobType;
import com.edumind.lms.modules.ai.repository.LessonSummaryRepository;
import com.edumind.lms.modules.course.api.EnrollmentQueryService;
import com.edumind.lms.modules.course.api.LessonQueryService;
import com.edumind.lms.modules.course.api.dto.LessonInfo;
import com.edumind.lms.modules.course.entity.Lesson;
import com.edumind.lms.shared.exception.ResourceNotFoundException;
import com.edumind.lms.shared.exception.UnauthorizedException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AiSummaryServiceImpl implements AiSummaryService {

    private final LessonQueryService lessonQueryService;
    private final EnrollmentQueryService enrollmentQueryService;
    private final AiJobService aiJobService;
    private final LessonSummaryRepository lessonSummaryRepository;
    private final AsyncSummaryProcessor asyncSummaryProcessor;
    private final ObjectMapper objectMapper;

    private static final TypeReference<List<String>> KEYPOINTS_TYPE_REF = new TypeReference<>() {};
    private static final TypeReference<List<com.edumind.lms.modules.ai.dto.response.VocabularyItem>> VOCAB_TYPE_REF =
            new TypeReference<>() {};

    @Override
    @Transactional
    public void requestSummaryGeneration(Lesson lesson) {
        // Auto-triggered by event listener, system user id = 0L
        Long userId = 0L;

        AiJobLog job = aiJobService.createJob(
                AiJobType.LESSON_SUMMARY,
                userId,
                lesson.getId()
        );

        asyncSummaryProcessor.process(
                job.getId(),
                lesson.getId(),
                lesson.getTitle(),
                lesson.getArticleContent()
        );
    }

    @Override
    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    public int reindexAll() {
        List<LessonInfo> lessons = lessonQueryService.findAllWithArticleContent();

        log.info("Backfilling summaries for {} lessons with article content", lessons.size());
        for (LessonInfo info : lessons) {
            AiJobLog job = null;
            try {
                job = aiJobService.createJob(AiJobType.LESSON_SUMMARY, 0L, info.id());
                asyncSummaryProcessor.process(job.getId(), info.id(), info.title(), info.articleContent());
            } catch (Exception e) {
                log.error("Failed to queue summary for lesson {}: {}", info.id(), e.getMessage());
                if (job != null) {
                    aiJobService.updateStatus(job.getId(), AiJobStatus.FAILED, "Task rejected: " + e.getMessage());
                }
            }
        }
        return lessons.size();
    }

    @Override
    public LessonSummaryResponse getSummaryByLesson(Long lessonId, Long userId) {
        LessonInfo lessonInfo = lessonQueryService.getLessonInfo(lessonId)
                .orElseThrow(() -> new ResourceNotFoundException("Lesson not found: " + lessonId));

        // ACL: instructor or enrolled student
        if (!lessonInfo.instructorId().equals(userId)
                && !enrollmentQueryService.isEnrolledAndActive(lessonInfo.courseId(), userId)) {
            throw new UnauthorizedException("You are not allowed to view this lesson summary");
        }

        LessonSummary summary = lessonSummaryRepository.findByLessonId(lessonId)
                .orElseThrow(() -> new ResourceNotFoundException("Summary not generated yet"));

        List<String> keyPoints = deserializeKeyPoints(summary.getKeyPointsJson());
        List<com.edumind.lms.modules.ai.dto.response.VocabularyItem> vocabulary =
                deserializeVocabulary(summary.getVocabularyJson());

        return LessonSummaryResponse.builder()
                .lessonId(summary.getLessonId())
                .summaryText(summary.getSummaryText())
                .keyPoints(keyPoints)
                .vocabulary(vocabulary)
                .updatedAt(summary.getUpdatedAt())
                .build();
    }

    private List<String> deserializeKeyPoints(String json) {
        try {
            return objectMapper.readValue(json, KEYPOINTS_TYPE_REF);
        } catch (Exception e) {
            log.error("Failed to deserialize keyPoints JSON: {}", json, e);
            throw new RuntimeException("Failed to deserialize key points", e);
        }
    }

    private List<com.edumind.lms.modules.ai.dto.response.VocabularyItem> deserializeVocabulary(String json) {
        try {
            return objectMapper.readValue(json, VOCAB_TYPE_REF);
        } catch (Exception e) {
            log.error("Failed to deserialize vocabulary JSON: {}", json, e);
            throw new RuntimeException("Failed to deserialize vocabulary", e);
        }
    }
}

