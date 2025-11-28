package com.edumind.lms.modules.course.controller;

import com.edumind.common.response.ApiResponse;
import com.edumind.lms.modules.course.dto.request.CreateLessonRequest;
import com.edumind.lms.modules.course.dto.request.ReorderLessonsRequest;
import com.edumind.lms.modules.course.dto.request.UpdateLessonRequest;
import com.edumind.lms.modules.course.dto.response.LessonResponse;
import com.edumind.lms.modules.course.entity.Lesson;
import com.edumind.lms.modules.course.service.LessonService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/lessons")
@RequiredArgsConstructor
public class LessonController {
    private final LessonService lessonService;

    @PostMapping("/sections/{sectionId}")
    @PreAuthorize("hasRole('TEACHER')")
    public ResponseEntity<ApiResponse<LessonResponse>> createLesson(
            @PathVariable Long sectionId,
            @Valid @RequestBody CreateLessonRequest request,
            Authentication authentication) {

        Long instructorId = extractUserId(authentication);

        // FIXED: Map to entity with correct fields
        Lesson lesson = new Lesson();
        lesson.setTitle(request.getTitle());
        lesson.setDescription(request.getDescription());
        lesson.setContentType(request.getContentType());
        lesson.setVideoUrl(request.getVideoUrl());
        lesson.setVideoDuration(request.getVideoDuration());
        lesson.setArticleContent(request.getArticleContent());
        lesson.setResources(request.getResources());
        lesson.setIsPreview(request.getIsPreview());
        lesson.setIsMandatory(request.getIsMandatory());

        Lesson createdLesson = lessonService.createLesson(sectionId, lesson, instructorId);

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(
                        "Lesson created successfully",
                        toResponse(createdLesson)
                ));
    }

    @PutMapping("/{lessonId}")
    @PreAuthorize("hasRole('TEACHER')")
    public ResponseEntity<ApiResponse<LessonResponse>> updateLesson(
            @PathVariable Long lessonId,
            @Valid @RequestBody UpdateLessonRequest request,
            Authentication authentication) {

        Long instructorId = extractUserId(authentication);

        // FIXED: Map to entity with correct fields
        Lesson lessonUpdate = new Lesson();
        lessonUpdate.setTitle(request.getTitle());
        lessonUpdate.setDescription(request.getDescription());
        lessonUpdate.setContentType(request.getContentType());
        lessonUpdate.setVideoUrl(request.getVideoUrl());
        lessonUpdate.setVideoDuration(request.getVideoDuration());
        lessonUpdate.setArticleContent(request.getArticleContent());
        lessonUpdate.setResources(request.getResources());
        lessonUpdate.setIsPreview(request.getIsPreview());
        lessonUpdate.setIsMandatory(request.getIsMandatory());

        Lesson updatedLesson = lessonService.updateLesson(lessonId, lessonUpdate, instructorId);

        return ResponseEntity.ok(ApiResponse.success(
                "Lesson updated successfully",
                toResponse(updatedLesson)
        ));
    }

    @DeleteMapping("/{lessonId}")
    @PreAuthorize("hasRole('TEACHER')")
    public ResponseEntity<ApiResponse<Void>> deleteLesson(
            @PathVariable Long lessonId,
            Authentication authentication) {

        Long instructorId = extractUserId(authentication);
        lessonService.deleteLesson(lessonId, instructorId);

        return ResponseEntity.ok(ApiResponse.success("Lesson deleted successfully", null));
    }

    @GetMapping("/{lessonId}")
    public ResponseEntity<ApiResponse<LessonResponse>> getLessonById(@PathVariable Long lessonId) {
        Lesson lesson = lessonService.getLessonById(lessonId);
        return ResponseEntity.ok(ApiResponse.success(toResponse(lesson)));
    }

    @GetMapping("/sections/{sectionId}")
    public ResponseEntity<ApiResponse<List<LessonResponse>>> getSectionLessons(@PathVariable Long sectionId) {
        List<Lesson> lessons = lessonService.getSectionLessons(sectionId);
        List<LessonResponse> response = lessons.stream()
                .map(this::toResponse)
                .collect(Collectors.toList());

        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/courses/{courseId}")
    public ResponseEntity<ApiResponse<List<LessonResponse>>> getCourseLessons(@PathVariable Long courseId) {
        List<Lesson> lessons = lessonService.getCourseLessons(courseId);
        List<LessonResponse> response = lessons.stream()
                .map(this::toResponse)
                .collect(Collectors.toList());

        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/courses/{courseId}/preview")
    public ResponseEntity<ApiResponse<List<LessonResponse>>> getPreviewLessons(@PathVariable Long courseId) {
        List<Lesson> lessons = lessonService.getPreviewLessons(courseId);
        List<LessonResponse> response = lessons.stream()
                .map(this::toResponse)
                .collect(Collectors.toList());

        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/{lessonId}/can-access")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<Boolean>> canAccessLesson(
            @PathVariable Long lessonId,
            Authentication authentication) {

        Long userId = extractUserId(authentication);
        boolean canAccess = lessonService.canAccessLesson(lessonId, userId);

        return ResponseEntity.ok(ApiResponse.success(canAccess));
    }

    @PutMapping("/sections/{sectionId}/reorder")
    @PreAuthorize("hasRole('TEACHER')")
    public ResponseEntity<ApiResponse<Void>> reorderLessons(
            @PathVariable Long sectionId,
            @Valid @RequestBody ReorderLessonsRequest request,
            Authentication authentication) {

        Long instructorId = extractUserId(authentication);
        lessonService.reorderLessons(sectionId, request.getLessonIds(), instructorId);

        return ResponseEntity.ok(ApiResponse.success("Lessons reordered successfully", null));
    }

    // Helper methods
    private Long extractUserId(Authentication authentication) {
        return Long.parseLong(authentication.getName());
    }

    // FIXED: Map entity to response with correct fields
    private LessonResponse toResponse(Lesson lesson) {
        return LessonResponse.builder()
                .id(lesson.getId())
                .sectionId(lesson.getSection().getId())
                .courseId(lesson.getCourse().getId())
                .title(lesson.getTitle())
                .description(lesson.getDescription())
                .contentType(lesson.getContentType())
                .videoUrl(lesson.getVideoUrl())
                .videoDuration(lesson.getVideoDuration())
                .articleContent(lesson.getArticleContent())
                .resources(lesson.getResources())
                .orderIndex(lesson.getOrderIndex())
                .isPreview(lesson.getIsPreview())
                .isMandatory(lesson.getIsMandatory())
                .createdAt(lesson.getCreatedAt())
                .updatedAt(lesson.getUpdatedAt())
                .build();
    }
}
