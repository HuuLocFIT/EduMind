package com.edumind.lms.modules.ai.service;

import com.edumind.lms.config.PostgresTestContainerConfig;
import com.edumind.lms.modules.ai.dto.response.LessonSummaryResponse;
import com.edumind.lms.modules.ai.dto.response.VocabularyItem;
import com.edumind.lms.modules.ai.entity.LessonSummary;
import com.edumind.lms.modules.ai.repository.LessonSummaryRepository;
import com.edumind.lms.modules.course.api.EnrollmentQueryService;
import com.edumind.lms.modules.course.api.LessonQueryService;
import com.edumind.lms.modules.course.api.dto.LessonInfo;
import com.edumind.lms.shared.exception.ResourceNotFoundException;
import com.edumind.lms.shared.exception.UnauthorizedException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.ContextConfiguration;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.when;

@SpringBootTest
@ActiveProfiles("test")
@ContextConfiguration(initializers = PostgresTestContainerConfig.Initializer.class)
@Import(PostgresTestContainerConfig.class)
@DisplayName("AiSummaryServiceImpl Tests")
class AiSummaryServiceImplTest {

    @MockBean
    private ChatModel chatModel;

    @MockBean
    private LessonQueryService lessonQueryService;

    @MockBean
    private EnrollmentQueryService enrollmentQueryService;

    @MockBean
    private LessonSummaryRepository lessonSummaryRepository;

    @MockBean
    private AiJobService aiJobService;

    @MockBean
    private AsyncSummaryProcessor asyncSummaryProcessor;

    @Autowired
    private AiSummaryServiceImpl aiSummaryService;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    @DisplayName("getSummaryByLesson throws UnauthorizedException when user is neither instructor nor enrolled")
    void getSummaryByLesson_unauthorizedWhenNotInstructorOrEnrolled() {
        Long lessonId = 1L;
        Long userId = 10L;
        LessonInfo lessonInfo = new LessonInfo(lessonId, "Title", "Content", 100L, 99L);

        when(lessonQueryService.getLessonInfo(lessonId)).thenReturn(Optional.of(lessonInfo));
        when(enrollmentQueryService.isEnrolledAndActive(lessonInfo.courseId(), userId)).thenReturn(false);

        assertThrows(UnauthorizedException.class, () -> aiSummaryService.getSummaryByLesson(lessonId, userId));
    }

    @Test
    @DisplayName("getSummaryByLesson throws ResourceNotFoundException when summary does not exist yet")
    void getSummaryByLesson_notFoundWhenSummaryMissing() {
        Long lessonId = 2L;
        Long userId = 200L;
        LessonInfo lessonInfo = new LessonInfo(lessonId, "Title", "Content", 300L, userId);

        when(lessonQueryService.getLessonInfo(lessonId)).thenReturn(Optional.of(lessonInfo));
        when(enrollmentQueryService.isEnrolledAndActive(anyLong(), anyLong())).thenReturn(true);
        when(lessonSummaryRepository.findByLessonId(lessonId)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> aiSummaryService.getSummaryByLesson(lessonId, userId));
    }

    @Test
    @DisplayName("getSummaryByLesson returns DTO when summary exists and user is instructor")
    void getSummaryByLesson_successForInstructor() throws Exception {
        Long lessonId = 3L;
        Long instructorId = 300L;
        LessonInfo lessonInfo = new LessonInfo(lessonId, "Lesson Title", "Content", 400L, instructorId);

        List<String> keyPoints = List.of("Point 1", "Point 2");
        List<VocabularyItem> vocabulary = List.of(
                new VocabularyItem("API", "Application Programming Interface"),
                new VocabularyItem("DB", "Database")
        );

        String keyPointsJson = objectMapper.writeValueAsString(keyPoints);
        String vocabularyJson = objectMapper.writeValueAsString(vocabulary);

        LessonSummary summary = LessonSummary.builder()
                .lessonId(lessonId)
                .jobId(1L)
                .summaryText("Summary text")
                .keyPointsJson(keyPointsJson)
                .vocabularyJson(vocabularyJson)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        when(lessonQueryService.getLessonInfo(lessonId)).thenReturn(Optional.of(lessonInfo));
        when(lessonSummaryRepository.findByLessonId(lessonId)).thenReturn(Optional.of(summary));

        LessonSummaryResponse response = aiSummaryService.getSummaryByLesson(lessonId, instructorId);

        assertEquals(lessonId, response.getLessonId());
        assertEquals("Summary text", response.getSummaryText());
        assertEquals(keyPoints, response.getKeyPoints());
        assertEquals(vocabulary.size(), response.getVocabulary().size());
        assertTrue(response.getVocabulary().stream().anyMatch(v -> "API".equals(v.term())));
    }
}

