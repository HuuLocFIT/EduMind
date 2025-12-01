package com.edumind.lms.modules.course.controller;

import com.edumind.common.response.ApiResponse;
import com.edumind.lms.modules.course.dto.request.UpdateProgressRequest;
import com.edumind.lms.modules.course.dto.response.LessonProgressResponse;
import com.edumind.lms.modules.course.entity.LessonProgress;
import com.edumind.lms.modules.course.service.LessonProgressService;
import com.edumind.lms.modules.course.util.LessonProgressMapper;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@RestController
@RequestMapping("/progress")
@RequiredArgsConstructor
public class LessonProgressController {
    private final LessonProgressService lessonProgressService;
    private final LessonProgressMapper lessonProgressMapper;

    @PostMapping("/start")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<ApiResponse<LessonProgressResponse>> startLesson(
            @RequestParam Long enrollmentId,
            @RequestParam Long lessonId,
            Authentication authentication) {

        Long studentId = Long.valueOf(authentication.getPrincipal().toString());
        log.info("Starting lesson: {} for enrollment: {}", lessonId, enrollmentId);

        LessonProgress progress = lessonProgressService.startLesson(enrollmentId, lessonId, studentId);
        LessonProgressResponse response = lessonProgressMapper.toResponse(progress);

        return ResponseEntity.ok(ApiResponse.success("Lesson started", response));
    }

    @PutMapping("/watch")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<ApiResponse<LessonProgressResponse>> updateWatchProgress(
            @Valid @RequestBody UpdateProgressRequest request) {

        log.info("Updating watch progress for lesson: {}", request.getLessonId());

        LessonProgress progress = lessonProgressService.updateWatchProgress(
                request.getEnrollmentId(),
                request.getLessonId(),
                request.getWatchDuration(),
                request.getLastPosition()
        );

        LessonProgressResponse response = lessonProgressMapper.toResponse(progress);
        return ResponseEntity.ok(ApiResponse.success("Progress updated", response));
    }

    @PutMapping("/complete")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<ApiResponse<LessonProgressResponse>> markLessonComplete(
            @RequestParam Long enrollmentId,
            @RequestParam Long lessonId) {

        log.info("Marking lesson as completed: {}", lessonId);

        LessonProgress progress = lessonProgressService.markLessonComplete(enrollmentId, lessonId);
        LessonProgressResponse response = lessonProgressMapper.toResponse(progress);

        return ResponseEntity.ok(ApiResponse.success("Lesson completed", response));
    }

    @GetMapping("/enrollment/{enrollmentId}")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<ApiResponse<List<LessonProgressResponse>>> getEnrollmentProgress(
            @PathVariable Long enrollmentId) {

        log.info("Getting progress for enrollment: {}", enrollmentId);

        List<LessonProgress> progressList = lessonProgressService.getEnrollmentProgress(enrollmentId);
        List<LessonProgressResponse> responses = progressList.stream()
                .map(lessonProgressMapper::toResponse)
                .collect(Collectors.toList());

        return ResponseEntity.ok(ApiResponse.success(responses));
    }

    @GetMapping("/enrollment/{enrollmentId}/completed")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<ApiResponse<List<LessonProgressResponse>>> getCompletedLessons(
            @PathVariable Long enrollmentId) {

        log.info("Getting completed lessons for enrollment: {}", enrollmentId);

        List<LessonProgress> progressList = lessonProgressService.getCompletedLessons(enrollmentId);
        List<LessonProgressResponse> responses = progressList.stream()
                .map(lessonProgressMapper::toResponse)
                .collect(Collectors.toList());

        return ResponseEntity.ok(ApiResponse.success(responses));
    }

    @GetMapping("/check")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<ApiResponse<Boolean>> checkLessonCompletion(
            @RequestParam Long enrollmentId,
            @RequestParam Long lessonId) {

        boolean isCompleted = lessonProgressService.isLessonCompleted(enrollmentId, lessonId);
        return ResponseEntity.ok(ApiResponse.success(isCompleted));
    }
}
