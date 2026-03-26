package com.edumind.lms.modules.course.controller;

import com.cloudinary.Cloudinary;
import com.edumind.common.response.ApiResponse;
import com.edumind.lms.modules.course.dto.request.ConfirmVideoUploadRequest;
import com.edumind.lms.modules.course.dto.request.CreateLessonRequest;
import com.edumind.lms.modules.course.dto.request.ReorderLessonsRequest;
import com.edumind.lms.modules.course.dto.request.UpdateLessonRequest;
import com.edumind.lms.modules.course.dto.response.LessonResponse;
import com.edumind.lms.modules.course.dto.response.VideoSignatureResponse;
import com.edumind.lms.modules.course.entity.Lesson;
import com.edumind.lms.modules.course.service.LessonService;
import com.edumind.lms.shared.exception.UnauthorizedException;
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
    private final Cloudinary cloudinary;

    @PostMapping("/sections/{sectionId}")
    @PreAuthorize("@teacherSecurity.isActiveTeacher()")
    public ResponseEntity<ApiResponse<LessonResponse>> createLesson(
            @PathVariable Long sectionId,
            @Valid @RequestBody CreateLessonRequest request,
            Authentication authentication) {

        Long instructorId = extractUserId(authentication);

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
    @PreAuthorize("@teacherSecurity.isActiveTeacher()")
    public ResponseEntity<ApiResponse<LessonResponse>> updateLesson(
            @PathVariable Long lessonId,
            @Valid @RequestBody UpdateLessonRequest request,
            Authentication authentication) {

        Long instructorId = extractUserId(authentication);

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
    @PreAuthorize("@teacherSecurity.isActiveTeacher()")
    public ResponseEntity<ApiResponse<Void>> deleteLesson(
            @PathVariable Long lessonId,
            Authentication authentication) {

        Long instructorId = extractUserId(authentication);
        lessonService.deleteLesson(lessonId, instructorId);

        return ResponseEntity.ok(ApiResponse.success("Lesson deleted successfully", null));
    }

    @GetMapping("/{lessonId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<LessonResponse>> getLessonById(
            @PathVariable Long lessonId,
            Authentication authentication) {

        Long userId = extractUserId(authentication);
        if (!lessonService.canAccessLesson(lessonId, userId)) {
            throw new UnauthorizedException("You are not allowed to access this lesson");
        }

        Lesson lesson = lessonService.getLessonById(lessonId);
        return ResponseEntity.ok(ApiResponse.success(toResponse(lesson)));
    }

    @GetMapping("/sections/{sectionId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<List<LessonResponse>>> getSectionLessons(
            @PathVariable Long sectionId,
            Authentication authentication) {

        Long userId = extractUserId(authentication);
        List<Lesson> lessons = lessonService.getSectionLessons(sectionId);

        List<LessonResponse> response = lessons.stream()
                .filter(lesson -> lessonService.canAccessLesson(lesson.getId(), userId))
                .map(this::toResponse)
                .collect(Collectors.toList());

        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/courses/{courseId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<List<LessonResponse>>> getCourseLessons(
            @PathVariable Long courseId,
            Authentication authentication) {

        Long userId = extractUserId(authentication);
        List<Lesson> lessons = lessonService.getCourseLessons(courseId);

        List<LessonResponse> response = lessons.stream()
                .filter(lesson -> lessonService.canAccessLesson(lesson.getId(), userId))
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
    @PreAuthorize("@teacherSecurity.isActiveTeacher()")
    public ResponseEntity<ApiResponse<Void>> reorderLessons(
            @PathVariable Long sectionId,
            @Valid @RequestBody ReorderLessonsRequest request,
            Authentication authentication) {

        Long instructorId = extractUserId(authentication);
        lessonService.reorderLessons(sectionId, request.getLessonIds(), instructorId);

        return ResponseEntity.ok(ApiResponse.success("Lessons reordered successfully", null));
    }

    @PostMapping("/{lessonId}/video/signature")
    @PreAuthorize("@teacherSecurity.isActiveTeacher()")
    public ResponseEntity<ApiResponse<VideoSignatureResponse>> generateVideoUploadSignature(
            @PathVariable Long lessonId,
            Authentication authentication) {

        Long instructorId = extractUserId(authentication);
        VideoSignatureResponse signature = lessonService.generateVideoUploadSignature(lessonId, instructorId);

        return ResponseEntity.ok(ApiResponse.success("Upload signature generated", signature));
    }

    @PatchMapping("/{lessonId}/video")
    @PreAuthorize("@teacherSecurity.isActiveTeacher()")
    public ResponseEntity<ApiResponse<LessonResponse>> confirmVideoUpload(
            @PathVariable Long lessonId,
            @Valid @RequestBody ConfirmVideoUploadRequest request,
            Authentication authentication) {

        Long instructorId = extractUserId(authentication);
        LessonResponse response = lessonService.confirmVideoUpload(lessonId, request, instructorId);

        return ResponseEntity.ok(ApiResponse.success("Video upload confirmed", response));
    }

    @DeleteMapping("/{lessonId}/video")
    @PreAuthorize("@teacherSecurity.isActiveTeacher()")
    public ResponseEntity<ApiResponse<Void>> deleteVideo(
            @PathVariable Long lessonId,
            Authentication authentication) {

        Long instructorId = extractUserId(authentication);
        lessonService.deleteVideo(lessonId, instructorId);

        return ResponseEntity.ok(ApiResponse.success("Video deleted successfully", null));
    }

    @PostMapping("/{lessonId}/video/reset")
    @PreAuthorize("@teacherSecurity.isActiveTeacher()")
    public ResponseEntity<ApiResponse<Void>> resetVideoUploadState(
            @PathVariable Long lessonId,
            Authentication authentication) {

        Long instructorId = extractUserId(authentication);
        lessonService.resetVideoUploadState(lessonId, instructorId);

        return ResponseEntity.ok(ApiResponse.success("Video upload state reset successfully", null));
    }

    // Helper methods
    private Long extractUserId(Authentication authentication) {
        return Long.parseLong(authentication.getName());
    }

    private String buildStreamUrl(Lesson lesson) {
        if (!Boolean.TRUE.equals(lesson.getHasHls()) || lesson.getVideoPublicId() == null) {
            return null;
        }
        return "https://res.cloudinary.com/" + cloudinary.config.cloudName
                + "/video/upload/sp_auto/" + lesson.getVideoPublicId() + ".m3u8";
    }

    private LessonResponse toResponse(Lesson lesson) {
        return LessonResponse.builder()
                .id(lesson.getId())
                .sectionId(lesson.getSection().getId())
                .courseId(lesson.getCourse().getId())
                .title(lesson.getTitle())
                .description(lesson.getDescription())
                .contentType(lesson.getContentType())
                .videoUrl(lesson.getVideoUrl())
                .videoStreamUrl(buildStreamUrl(lesson))
                .videoDuration(lesson.getVideoDuration())
                .videoUploadStatus(lesson.getVideoUploadStatus())
                .videoPublicId(lesson.getVideoPublicId())
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
