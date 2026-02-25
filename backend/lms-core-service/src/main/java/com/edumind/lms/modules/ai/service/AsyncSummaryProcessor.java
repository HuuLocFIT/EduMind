package com.edumind.lms.modules.ai.service;

import com.edumind.lms.modules.ai.dto.response.VocabularyItem;
import com.edumind.lms.modules.ai.entity.LessonSummary;
import com.edumind.lms.modules.ai.enums.AiJobStatus;
import com.edumind.lms.modules.ai.repository.LessonSummaryRepository;
import com.edumind.lms.modules.ai.util.AiPromptBuilder;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class AsyncSummaryProcessor {

    private final AiJobService aiJobService;
    private final LessonSummaryRepository lessonSummaryRepository;
    private final ObjectMapper objectMapper;

    @Autowired(required = false)
    private ChatClient chatClient;

    record SummaryResult(String summaryText, List<String> keyPoints, List<VocabularyItem> vocabulary) {
    }

    @Async("aiTaskExecutor")
    public void process(Long jobId, Long lessonId, String lessonTitle, String articleContent) {
        try {
            aiJobService.updateStatus(jobId, AiJobStatus.PROCESSING, null);
            String prompt = AiPromptBuilder.buildSummaryPrompt(lessonTitle, articleContent);

            SummaryResult result = callOnce(prompt);

            String keyPointsJson = objectMapper.writeValueAsString(result.keyPoints());
            String vocabularyJson = objectMapper.writeValueAsString(result.vocabulary());

            lessonSummaryRepository.upsert(
                    lessonId,
                    jobId,
                    result.summaryText(),
                    keyPointsJson,
                    vocabularyJson
            );

            aiJobService.updateStatus(jobId, AiJobStatus.COMPLETED, null);
        } catch (Exception e) {
            log.error("Lesson summary generation failed for job {}: {}", jobId, e.getMessage(), e);
            String msg = e.getMessage();
            if (msg != null && msg.length() > 500) {
                msg = msg.substring(0, 500) + "...";
            }
            aiJobService.updateStatus(jobId, AiJobStatus.FAILED, msg);
        }
    }

    private SummaryResult callOnce(String prompt) {
        return chatClient.prompt(prompt)
                .call()
                .entity(new ParameterizedTypeReference<SummaryResult>() {});
    }
}

