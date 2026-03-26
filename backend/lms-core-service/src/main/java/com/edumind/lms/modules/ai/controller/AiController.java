package com.edumind.lms.modules.ai.controller;

import com.edumind.common.response.ApiResponse;
import com.edumind.lms.modules.ai.dto.request.ChatRequest;
import com.edumind.lms.modules.ai.dto.request.GenerateQuizRequest;
import com.edumind.lms.modules.ai.dto.request.SubmitQuizAttemptRequest;
import com.edumind.lms.modules.ai.dto.request.TranscribeRequest;
import com.edumind.lms.modules.ai.dto.request.UpdateQuizQuestionsRequest;
import com.edumind.lms.modules.ai.dto.response.AiJobResponse;
import com.edumind.lms.modules.ai.dto.response.ChatResponse;
import com.edumind.lms.modules.ai.dto.response.GeneratedQuizResponse;
import com.edumind.lms.modules.ai.dto.response.LessonSummaryResponse;
import com.edumind.lms.modules.ai.dto.response.QuizAttemptResponse;
import com.edumind.lms.modules.ai.service.AiJobService;
import com.edumind.lms.modules.ai.service.AiQuizService;
import com.edumind.lms.modules.ai.service.AiSummaryService;
import com.edumind.lms.modules.ai.service.EmbeddingService;
import com.edumind.lms.modules.ai.service.RagService;
import com.edumind.lms.modules.ai.service.transcription.WhisperTranscriptionService;
import com.edumind.lms.shared.exception.UnauthorizedException;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.codec.ServerSentEvent;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/ai")
@RequiredArgsConstructor
public class AiController {

    private final AiJobService aiJobService;
    private final AiQuizService aiQuizService;
    private final AiSummaryService aiSummaryService;
    private final RagService ragService;
    private final EmbeddingService embeddingService;
    private final WhisperTranscriptionService whisperTranscriptionService;

    /**
     * Get AI job status - used for polling after async job submission.
     * Only the job owner can poll their own jobs.
     */
    @GetMapping("/jobs/{id}")
    public ResponseEntity<ApiResponse<AiJobResponse>> getJobStatus(
            @PathVariable Long id,
            Authentication authentication) {
        Long userId = extractUserId(authentication);
        AiJobResponse response = aiJobService.getJobStatus(id);
        if (!response.getUserId().equals(userId)) {
            throw new UnauthorizedException("You do not have access to this job");
        }
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    /**
     * Request quiz generation from lesson content.
     * Returns 202 Accepted with job ID for polling.
     */
    @PostMapping("/quizzes/generate")
    @PreAuthorize("@teacherSecurity.isActiveTeacherOrAdmin()")
    public ResponseEntity<ApiResponse<AiJobResponse>> generateQuiz(
            @Valid @RequestBody GenerateQuizRequest request,
            Authentication authentication) {
        return ResponseEntity.accepted()
                .body(ApiResponse.success(aiQuizService.requestQuizGeneration(request, extractUserId(authentication))));
    }

    /**
     * Get all generated quizzes for a lesson.
     */
    @GetMapping("/quizzes/lesson/{lessonId}")
    @PreAuthorize("@teacherSecurity.isActiveTeacherOrAdmin()")
    public ResponseEntity<ApiResponse<List<GeneratedQuizResponse>>> getQuizzesByLesson(
            @PathVariable Long lessonId,
            Authentication authentication) {
        return ResponseEntity.ok(ApiResponse.success(aiQuizService.getQuizzesByLesson(lessonId, extractUserId(authentication))));
    }

    /**
     * Update questions for an existing quiz (teacher only).
     */
    @PutMapping("/quizzes/{quizId}/questions")
    @PreAuthorize("@teacherSecurity.isActiveTeacherOrAdmin()")
    public ResponseEntity<ApiResponse<GeneratedQuizResponse>> updateQuizQuestions(
            @PathVariable Long quizId,
            @RequestBody @Valid UpdateQuizQuestionsRequest request,
            Authentication authentication) {
        return ResponseEntity.ok(ApiResponse.success(
                aiQuizService.updateQuizQuestions(quizId, extractUserId(authentication), request)));
    }

    /**
     * Get the latest quiz for a student to take.
     * Returns quiz with questions (without correct answers) or null if no quiz exists.
     */
    @GetMapping("/quizzes/lesson/{lessonId}/take")
    public ResponseEntity<ApiResponse<GeneratedQuizResponse>> getQuizForStudent(
            @PathVariable Long lessonId,
            Authentication authentication) {
        GeneratedQuizResponse quiz = aiQuizService.getLatestQuizForStudent(lessonId, extractUserId(authentication));
        if (quiz == null) {
            return ResponseEntity.ok(ApiResponse.success(null));
        }
        return ResponseEntity.ok(ApiResponse.success(quiz));
    }

    /**
     * Submit a quiz attempt and get scored results with full question review.
     */
    @PostMapping("/quizzes/attempts")
    public ResponseEntity<ApiResponse<QuizAttemptResponse>> submitAttempt(
            @Valid @RequestBody SubmitQuizAttemptRequest request,
            Authentication authentication) {
        return ResponseEntity.ok(ApiResponse.success(aiQuizService.submitAttempt(request, extractUserId(authentication))));
    }

    /**
     * Get all past attempts for a student in a lesson.
     */
    @GetMapping("/quizzes/lesson/{lessonId}/my-attempts")
    public ResponseEntity<ApiResponse<List<QuizAttemptResponse>>> getMyAttempts(
            @PathVariable Long lessonId,
            Authentication authentication) {
        return ResponseEntity.ok(ApiResponse.success(aiQuizService.getMyAttempts(lessonId, extractUserId(authentication))));
    }

    @GetMapping("/summaries/lesson/{lessonId}")
    public ResponseEntity<ApiResponse<LessonSummaryResponse>> getSummary(
            @PathVariable Long lessonId,
            Authentication authentication) {
        Long userId = extractUserId(authentication);
        return ResponseEntity.ok(ApiResponse.success(aiSummaryService.getSummaryByLesson(lessonId, userId)));
    }

    @PostMapping("/chat/courses/{courseId}")
    public ResponseEntity<ApiResponse<ChatResponse>> chat(
            @PathVariable Long courseId,
            @Valid @RequestBody ChatRequest request,
            Authentication authentication) {
        Long userId = extractUserId(authentication);
        ChatResponse response = ragService.chat(courseId, request, userId);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PostMapping(
            value = "/chat/courses/{courseId}/stream",
            produces = MediaType.TEXT_EVENT_STREAM_VALUE
    )
    public Flux<ServerSentEvent<String>> chatStream(
            @PathVariable Long courseId,
            @Valid @RequestBody ChatRequest request,
            Authentication authentication
    ) {
        Long userId = extractUserId(authentication);
        return ragService.chatStream(courseId, request, userId);
    }

    /**
     * Backfill embeddings for all lessons that have article content but no embeddings yet.
     * Use this once after deploying the embedding feature to index existing lessons.
     */
    @PostMapping("/admin/reindex-embeddings")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<String>> reindexEmbeddings() {
        int count = embeddingService.reindexAll();
        return ResponseEntity.accepted()
                .body(ApiResponse.success("Queued " + count + " embedding jobs"));
    }

    /**
     * Backfill summaries for all lessons that have article content but no summaries yet.
     */
    @PostMapping("/admin/reindex-summaries")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<String>> reindexSummaries() {
        int count = aiSummaryService.reindexAll();
        return ResponseEntity.accepted()
                .body(ApiResponse.success("Queued " + count + " summary jobs"));
    }

    /**
     * Request transcription for a lesson video URL.
     * Returns 202 Accepted with job ID for polling.
     */
    @PostMapping("/transcribe/lessons/{lessonId}")
    @PreAuthorize("@teacherSecurity.isActiveTeacher()")
    public ResponseEntity<ApiResponse<AiJobResponse>> transcribeLesson(
            @PathVariable Long lessonId,
            @Valid @RequestBody TranscribeRequest request,
            Authentication authentication
    ) {
        Long userId = extractUserId(authentication);
        AiJobResponse response = whisperTranscriptionService.requestTranscription(lessonId, request.videoUrl(), request.language(), userId);
        return ResponseEntity.accepted().body(ApiResponse.success(response));
    }

    private Long extractUserId(Authentication authentication) {
        return Long.valueOf(authentication.getPrincipal().toString());
    }
}
