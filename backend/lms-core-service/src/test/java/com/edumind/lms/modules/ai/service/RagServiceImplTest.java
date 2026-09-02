package com.edumind.lms.modules.ai.service;

import com.edumind.lms.modules.ai.dto.request.ChatRequest;
import com.edumind.lms.modules.ai.entity.KnowledgeGapQuestion;
import com.edumind.lms.modules.ai.repository.KnowledgeGapQuestionRepository;
import com.edumind.lms.modules.ai.repository.LessonChunkProjection;
import com.edumind.lms.modules.ai.repository.LessonEmbeddingRepository;
import com.edumind.lms.modules.course.api.CourseQueryService;
import com.edumind.lms.modules.course.api.EnrollmentQueryService;
import com.edumind.lms.modules.course.api.LessonQueryService;
import com.edumind.lms.modules.course.api.dto.LessonInfo;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.embedding.EmbeddingModel;
import org.springframework.test.util.ReflectionTestUtils;
import reactor.core.publisher.Flux;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.RETURNS_DEEP_STUBS;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class RagServiceImplTest {

    private final LessonQueryService lessonQueryService = mock(LessonQueryService.class);
    private final EnrollmentQueryService enrollmentQueryService = mock(EnrollmentQueryService.class);
    private final CourseQueryService courseQueryService = mock(CourseQueryService.class);
    private final LessonEmbeddingRepository lessonEmbeddingRepository = mock(LessonEmbeddingRepository.class);
    private final KnowledgeGapQuestionRepository knowledgeGapQuestionRepository = mock(KnowledgeGapQuestionRepository.class);
    private final RateLimitHelper rateLimitHelper = mock(RateLimitHelper.class);
    private final ChatClient chatClient = mock(ChatClient.class, RETURNS_DEEP_STUBS);
    private final EmbeddingModel embeddingModel = mock(EmbeddingModel.class);

    private RagServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new RagServiceImpl(
                lessonQueryService,
                enrollmentQueryService,
                courseQueryService,
                lessonEmbeddingRepository,
                knowledgeGapQuestionRepository,
                rateLimitHelper,
                new ObjectMapper()
        );
        ReflectionTestUtils.setField(service, "chatClient", chatClient);
        ReflectionTestUtils.setField(service, "embeddingModel", embeddingModel);

        when(enrollmentQueryService.isEnrolledAndActive(7L, 3L)).thenReturn(true);
        when(rateLimitHelper.incrementAndGet(3L)).thenReturn(1);
        when(embeddingModel.embed(anyString())).thenReturn(new float[]{0.1f, 0.2f});
        when(chatClient.prompt(anyString()).call().content()).thenReturn("Answer");
        when(chatClient.prompt(anyString()).stream().content()).thenReturn(Flux.just("Answer"));
    }

    @Test
    void savesQuestionWhenNoCourseChunksProduceGapTier() {
        when(lessonEmbeddingRepository.findTopK(anyLong(), anyString(), anyInt())).thenReturn(List.of());

        var response = service.chat(7L, new ChatRequest("Unknown topic", null), 3L);

        assertThat(response.getConfidenceTier()).isEqualTo("GAP");
        verify(knowledgeGapQuestionRepository).save(any(KnowledgeGapQuestion.class));
    }

    @Test
    void doesNotSaveQuestionWhenTopChunkIsHighConfidence() {
        LessonChunkProjection chunk = mock(LessonChunkProjection.class);
        when(chunk.getLessonId()).thenReturn(21L);
        when(chunk.getChunkText()).thenReturn("Relevant lesson text");
        when(chunk.getDistance()).thenReturn(0.2);
        when(lessonEmbeddingRepository.findTopK(anyLong(), anyString(), anyInt())).thenReturn(List.of(chunk));
        when(lessonQueryService.getLessonInfo(21L)).thenReturn(Optional.of(
                new LessonInfo(21L, "Relevant lesson", "Relevant lesson text", 7L, 9L)
        ));

        var response = service.chat(7L, new ChatRequest("Covered topic", List.of()), 3L);

        assertThat(response.getConfidenceTier()).isEqualTo("HIGH");
        verify(knowledgeGapQuestionRepository, never()).save(any());
    }

    @Test
    void streamingPathAlsoSavesGapBeforeEmittingMetadata() {
        when(lessonEmbeddingRepository.findTopK(anyLong(), anyString(), anyInt())).thenReturn(List.of());

        var events = service.chatStream(
                7L,
                new ChatRequest("Unknown streaming topic", List.of()),
                3L
        ).collectList().block();

        assertThat(events).isNotNull();
        assertThat(events).extracting(event -> event.event()).containsExactly("chunk", "metadata");
        assertThat(events.get(1).data()).contains("\"confidenceTier\":\"GAP\"");
        verify(knowledgeGapQuestionRepository).save(any(KnowledgeGapQuestion.class));
    }

    @Test
    void offTopicQuestionSkipsRetrievalAndKnowledgeGapLogging() {
        when(chatClient.prompt(contains("Classify whether")).call().content())
                .thenReturn("{\"scope\":\"OFF_TOPIC\"}");

        var response = service.chat(
                7L,
                new ChatRequest("What should I cook tonight?", List.of()),
                3L
        );

        assertThat(response.getQuestionScope().name()).isEqualTo("OFF_TOPIC");
        assertThat(response.getConfidenceTier()).isNull();
        assertThat(response.getSourceLessons()).isEmpty();
        verify(embeddingModel, never()).embed(anyString());
        verify(lessonEmbeddingRepository, never()).findTopK(anyLong(), anyString(), anyInt());
        verify(knowledgeGapQuestionRepository, never()).save(any());
    }
}
