package com.edumind.lms.modules.ai.service;

import com.edumind.lms.modules.ai.dto.response.QuizQuestionDto;
import com.edumind.lms.modules.ai.entity.GeneratedQuiz;
import com.edumind.lms.modules.ai.enums.AiJobStatus;
import com.edumind.lms.modules.ai.repository.GeneratedQuizRepository;
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
public class AsyncQuizProcessor {

    private final AiJobService aiJobService;
    private final GeneratedQuizRepository generatedQuizRepository;
    private final ObjectMapper objectMapper;

    @Autowired(required = false)
    private ChatClient chatClient;

    @Async("aiTaskExecutor")
    public void process(Long jobId, Long lessonId, String lessonTitle, String articleContent, int questionCount) {
        try {
            aiJobService.updateStatus(jobId, AiJobStatus.PROCESSING, null);
            String prompt = AiPromptBuilder.buildQuizPrompt(lessonTitle, articleContent, questionCount);

            List<QuizQuestionDto> questions = callOnce(prompt);

            generatedQuizRepository.save(GeneratedQuiz.builder()
                    .lessonId(lessonId)
                    .jobId(jobId)
                    .questionsJson(objectMapper.writeValueAsString(questions))
                    .build());
            aiJobService.updateStatus(jobId, AiJobStatus.COMPLETED, null);

        } catch (Exception e) {
            log.error("Quiz generation failed for job {}: {}", jobId, e.getMessage(), e);
            String msg = e.getMessage();
            if (msg != null && msg.length() > 500) {
                msg = msg.substring(0, 500) + "...";
            }
            aiJobService.updateStatus(jobId, AiJobStatus.FAILED, msg);
        }
    }

    private List<QuizQuestionDto> callOnce(String prompt) {
        return chatClient.prompt(prompt)
                .call()
                .entity(new ParameterizedTypeReference<List<QuizQuestionDto>>() {});
    }
}
