package com.edumind.lms.modules.ai.controller;

import com.edumind.common.response.ApiResponse;
import com.edumind.lms.modules.ai.dto.request.GenerateQuizRequest;
import com.edumind.lms.modules.ai.dto.request.SubmitQuizAttemptRequest;
import com.edumind.lms.modules.ai.dto.response.AiJobResponse;
import com.edumind.lms.modules.ai.dto.response.GeneratedQuizResponse;
import com.edumind.lms.modules.ai.dto.response.QuizAttemptResponse;
import com.edumind.lms.modules.ai.service.AiJobService;
import com.edumind.lms.modules.ai.service.AiQuizService;
import com.edumind.lms.shared.exception.UnauthorizedException;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/ai")
@RequiredArgsConstructor
public class AiController {

    private final AiJobService aiJobService;
    private final AiQuizService aiQuizService;

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

    private Long extractUserId(Authentication authentication) {
        return Long.valueOf(authentication.getPrincipal().toString());
    }
}
