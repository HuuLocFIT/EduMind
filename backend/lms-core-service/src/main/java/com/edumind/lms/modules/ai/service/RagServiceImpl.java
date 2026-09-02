package com.edumind.lms.modules.ai.service;

import com.edumind.common.exception.TooManyRequestsException;
import com.edumind.lms.modules.ai.dto.request.ChatRequest;
import com.edumind.lms.modules.ai.dto.response.ChatResponse;
import com.edumind.lms.modules.ai.dto.response.QuestionScope;
import com.edumind.lms.modules.ai.dto.response.SourceLessonDto;
import com.edumind.lms.modules.ai.entity.KnowledgeGapQuestion;
import com.edumind.lms.modules.ai.repository.LessonChunkProjection;
import com.edumind.lms.modules.ai.repository.LessonEmbeddingRepository;
import com.edumind.lms.modules.ai.repository.KnowledgeGapQuestionRepository;
import com.edumind.lms.modules.ai.util.AiPromptBuilder;
import com.edumind.lms.modules.course.api.CourseQueryService;
import com.edumind.lms.modules.course.api.EnrollmentQueryService;
import com.edumind.lms.modules.course.api.LessonQueryService;
import com.edumind.lms.shared.exception.BadRequestException;
import com.edumind.lms.shared.exception.UnauthorizedException;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.embedding.EmbeddingModel;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.codec.ServerSentEvent;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class RagServiceImpl implements RagService {

    private final LessonQueryService lessonQueryService;
    private final EnrollmentQueryService enrollmentQueryService;
    private final CourseQueryService courseQueryService;
    private final LessonEmbeddingRepository lessonEmbeddingRepository;
    private final KnowledgeGapQuestionRepository knowledgeGapQuestionRepository;
    private final RateLimitHelper rateLimitHelper;

    private final ObjectMapper objectMapper;

    @Autowired(required = false)
    private ChatClient chatClient;

    @Autowired(required = false)
    private EmbeddingModel embeddingModel;

    private static final int DAILY_LIMIT = 20;
    private static final int TOP_K = 5;
    private static final double HIGH_CONFIDENCE_THRESHOLD = 0.3;   // similarity > 0.85
    private static final double MEDIUM_CONFIDENCE_THRESHOLD = 0.6; // similarity > 0.70

    @Override
    @Transactional
    public ChatResponse chat(Long courseId, ChatRequest request, Long userId) {
        // ACL: ensure user is enrolled or instructor of the course
        ensureCourseAccess(courseId, userId);

        // 1. Rate limit check
        int currentCount = rateLimitHelper.incrementAndGet(userId);
        if (currentCount > DAILY_LIMIT) {
            throw new TooManyRequestsException("Daily AI chat limit exceeded");
        }

        if (chatClient == null || embeddingModel == null) {
            throw new BadRequestException("AI service is not available. Please configure GEMINI_API_KEY.");
        }

        QuestionScope questionScope = classifyQuestionScope(request);
        if (questionScope == QuestionScope.OFF_TOPIC) {
            String answer = chatClient.prompt(AiPromptBuilder.buildOffTopicPrompt(request.getQuestion()))
                    .call()
                    .content();
            return ChatResponse.builder()
                    .answer(answer)
                    .sourceLessons(List.of())
                    .confidenceTier(null)
                    .questionScope(questionScope)
                    .build();
        }

        // 2. Embed question & vector search
        List<LessonChunkProjection> topChunks = findRelevantChunks(courseId, request.getQuestion());

        // 3. Deduplicate source lessons and fetch titles
        List<SourceLessonDto> sourceLessons = resolveSourceLessons(topChunks);

        // 4. Classify confidence based on retrieval scores
        String confidenceHint = classifyConfidence(topChunks);
        logClassification(courseId, topChunks, confidenceHint);

        // 5. Optionally log knowledge gaps when retrieval confidence is low
        if ("GAP".equals(confidenceHint)) {
            knowledgeGapQuestionRepository.save(
                    KnowledgeGapQuestion.builder()
                            .courseId(courseId)
                            .question(request.getQuestion())
                            .build()
            );
        }

        // 6. Build prompt with confidence hint
        String prompt = AiPromptBuilder.buildRagPrompt(
                request.getQuestion(),
                topChunks,
                Optional.ofNullable(request.getRecentHistory()).orElseGet(ArrayList::new),
                confidenceHint
        );

        // 7. Call LLM
        String answer = chatClient.prompt(prompt)
                .call()
                .content();

        return ChatResponse.builder()
                .answer(answer)
                .sourceLessons(sourceLessons)
                .confidenceTier(confidenceHint)
                .questionScope(questionScope)
                .build();
    }

    @Override
    public Flux<ServerSentEvent<String>> chatStream(Long courseId, ChatRequest request, Long userId) {
        // Flux.defer ensures the pre-checks run during subscription (not at call time).
        // This means this method never throws synchronously, which is required for
        // reactive return types in Spring MVC — synchronous throws escape
        // ExceptionHandlerExceptionResolver because it cannot write a JSON error body
        // to a request with Accept: text/event-stream, causing the exception to
        // propagate to Tomcat and result in a misleading 401/500.
        return Flux.<ServerSentEvent<String>>defer(() -> {
            ensureCourseAccess(courseId, userId);

            int currentCount = rateLimitHelper.incrementAndGet(userId);
            if (currentCount > DAILY_LIMIT) {
                throw new TooManyRequestsException("Daily AI chat limit exceeded");
            }

            if (chatClient == null || embeddingModel == null) {
                throw new BadRequestException("AI service is not available. Please configure GEMINI_API_KEY.");
            }

            QuestionScope questionScope = classifyQuestionScope(request);
            if (questionScope == QuestionScope.OFF_TOPIC) {
                Flux<ServerSentEvent<String>> offTopicChunks = chatClient
                        .prompt(AiPromptBuilder.buildOffTopicPrompt(request.getQuestion()))
                        .stream()
                        .content()
                        .map(chunk -> ServerSentEvent.<String>builder()
                                .event("chunk")
                                .data(chunk)
                                .build());
                return Flux.concat(
                        offTopicChunks,
                        metadataEvent(List.of(), null, questionScope)
                );
            }

            List<LessonChunkProjection> topChunks = findRelevantChunks(courseId, request.getQuestion());
            List<SourceLessonDto> sourceLessons = resolveSourceLessons(topChunks);
            String confidenceHint = classifyConfidence(topChunks);
            logClassification(courseId, topChunks, confidenceHint);

            if ("GAP".equals(confidenceHint)) {
                knowledgeGapQuestionRepository.save(
                        KnowledgeGapQuestion.builder()
                                .courseId(courseId)
                                .question(request.getQuestion())
                                .build()
                );
            }

            String prompt = AiPromptBuilder.buildRagPrompt(
                    request.getQuestion(),
                    topChunks,
                    Optional.ofNullable(request.getRecentHistory()).orElseGet(ArrayList::new),
                    confidenceHint
            );

            Flux<ServerSentEvent<String>> chunkEvents = chatClient.prompt(prompt)
                    .stream()
                    .content()
                    .map(chunk -> ServerSentEvent.<String>builder()
                            .event("chunk")
                            .data(chunk)
                            .build())
                    .onErrorResume(e -> {
                        log.error("AI streaming error for course {}: {}", courseId, e.getMessage(), e);
                        String errorJson;
                        try {
                            errorJson = objectMapper.writeValueAsString(
                                    Map.of("message", "AI response failed, please try again."));
                        } catch (JsonProcessingException ex) {
                            errorJson = "{\"message\":\"AI response failed\"}";
                        }
                        return Flux.just(ServerSentEvent.<String>builder()
                                .event("error")
                                .data(errorJson)
                                .build());
                    });

            return Flux.concat(
                    chunkEvents,
                    metadataEvent(sourceLessons, confidenceHint, questionScope)
            );
        })
        .onErrorResume(TooManyRequestsException.class, e ->
                sseErrorFlux("Daily AI chat limit exceeded (20/day)."))
        .onErrorResume(UnauthorizedException.class, e ->
                sseErrorFlux(e.getMessage()))
        .onErrorResume(e -> {
            log.error("Unexpected error in AI chat stream for course {}: {}", courseId, e.getMessage(), e);
            return sseErrorFlux("Something went wrong. Please try again.");
        });
    }

    private Flux<ServerSentEvent<String>> sseErrorFlux(String message) {
        String errorJson;
        try {
            errorJson = objectMapper.writeValueAsString(Map.of("message", message));
        } catch (JsonProcessingException e) {
            errorJson = "{\"message\":\"error\"}";
        }
        return Flux.just(ServerSentEvent.<String>builder()
                .event("error")
                .data(errorJson)
                .build());
    }

    private Mono<ServerSentEvent<String>> metadataEvent(
            List<SourceLessonDto> sourceLessons,
            String confidenceTier,
            QuestionScope questionScope
    ) {
        return Mono.fromCallable(() -> {
            Map<String, Object> metadata = new LinkedHashMap<>();
            metadata.put("sourceLessons", sourceLessons);
            metadata.put("confidenceTier", confidenceTier);
            metadata.put("questionScope", questionScope.name());

            String json;
            try {
                json = objectMapper.writeValueAsString(metadata);
            } catch (JsonProcessingException e) {
                log.error("Failed to serialize AI chat metadata", e);
                json = "{\"sourceLessons\":[],\"confidenceTier\":\"GAP\",\"questionScope\":\"IN_SCOPE_IT\"}";
            }

            return ServerSentEvent.<String>builder()
                    .event("metadata")
                    .data(json)
                    .build();
        });
    }

    private QuestionScope classifyQuestionScope(ChatRequest request) {
        try {
            String result = chatClient.prompt(AiPromptBuilder.buildQuestionScopePrompt(
                            request.getQuestion(),
                            Optional.ofNullable(request.getRecentHistory()).orElseGet(ArrayList::new)
                    ))
                    .call()
                    .content();
            String scope = objectMapper.readTree(result).path("scope").asText();
            return QuestionScope.OFF_TOPIC.name().equals(scope)
                    ? QuestionScope.OFF_TOPIC
                    : QuestionScope.IN_SCOPE_IT;
        } catch (Exception e) {
            log.warn("Question-scope classification failed; defaulting to IN_SCOPE_IT: {}", e.getMessage());
            return QuestionScope.IN_SCOPE_IT;
        }
    }

    private void ensureCourseAccess(Long courseId, Long userId) {
        // Fast path: check if user is enrolled and active
        if (enrollmentQueryService.isEnrolledAndActive(courseId, userId)) {
            return;
        }

        // Allow instructor of this course as well
        boolean isInstructor = courseQueryService.getCourseInfo(courseId)
                .map(info -> info.instructorId().equals(userId))
                .orElse(false);
        if (isInstructor) {
            return;
        }

        throw new UnauthorizedException("You are not allowed to access AI chat for this course");
    }

    private List<LessonChunkProjection> findRelevantChunks(Long courseId, String question) {
        float[] vector = embeddingModel.embed(question);
        String vectorStr = java.util.Arrays.toString(vector);
        return lessonEmbeddingRepository.findTopK(courseId, vectorStr, TOP_K);
    }

    private List<SourceLessonDto> resolveSourceLessons(List<LessonChunkProjection> chunks) {
        Map<Long, SourceLessonDto> byLessonId = new LinkedHashMap<>();

        for (LessonChunkProjection chunk : chunks) {
            Long lessonId = chunk.getLessonId();
            if (!byLessonId.containsKey(lessonId)) {
                lessonQueryService.getLessonInfo(lessonId).ifPresentOrElse(
                        info -> byLessonId.put(lessonId, new SourceLessonDto(lessonId, info.title())),
                        () -> log.warn("Embedding references deleted lesson {}, skipping from source list", lessonId)
                );
            }
        }

        return new ArrayList<>(byLessonId.values());
    }

    private String classifyConfidence(List<LessonChunkProjection> chunks) {
        if (chunks == null || chunks.isEmpty()) {
            return "GAP";
        }

        Double topDistance = chunks.get(0).getDistance();
        if (topDistance == null || topDistance > MEDIUM_CONFIDENCE_THRESHOLD) {
            return "GAP";
        }
        if (topDistance > HIGH_CONFIDENCE_THRESHOLD) {
            return "MEDIUM";
        }
        return "HIGH";
    }

    private void logClassification(
            Long courseId,
            List<LessonChunkProjection> chunks,
            String confidenceTier
    ) {
        Double topDistance = chunks == null || chunks.isEmpty()
                ? null
                : chunks.get(0).getDistance();
        log.info(
                "RAG classification: courseId={}, topDistance={}, tier={}",
                courseId,
                topDistance,
                confidenceTier
        );
    }
}
