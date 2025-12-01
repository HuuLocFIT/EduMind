package com.edumind.lms.modules.course.controller;

import com.edumind.common.response.ApiResponse;
import com.edumind.lms.modules.course.dto.request.CreateSectionRequest;
import com.edumind.lms.modules.course.dto.request.ReorderSectionsRequest;
import com.edumind.lms.modules.course.dto.request.UpdateSectionRequest;
import com.edumind.lms.modules.course.dto.response.SectionDetailResponse;
import com.edumind.lms.modules.course.dto.response.SectionResponse;
import com.edumind.lms.modules.course.entity.Section;
import com.edumind.lms.modules.course.service.LessonService;
import com.edumind.lms.modules.course.service.SectionService;
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
@RequestMapping("/sections")
@RequiredArgsConstructor
public class SectionController {
    private final SectionService sectionService;
    private final LessonService lessonService;

    @PostMapping("/courses/{courseId}")
    @PreAuthorize("hasRole('TEACHER')")
    public ResponseEntity<ApiResponse<SectionResponse>> createSection(
            @PathVariable Long courseId,
            @Valid @RequestBody CreateSectionRequest request,
            Authentication authentication) {

        Long instructorId = extractUserId(authentication);

        Section section = new Section();
        section.setTitle(request.getTitle());
        section.setDescription(request.getDescription());

        Section createdSection = sectionService.createSection(courseId, section, instructorId);

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(
                        "Section created successfully",
                        toResponse(createdSection)
                ));
    }

    @PutMapping("/{sectionId}")
    @PreAuthorize("hasRole('TEACHER')")
    public ResponseEntity<ApiResponse<SectionResponse>> updateSection(
            @PathVariable Long sectionId,
            @Valid @RequestBody UpdateSectionRequest request,
            Authentication authentication) {

        Long instructorId = extractUserId(authentication);

        Section sectionUpdate = new Section();
        sectionUpdate.setTitle(request.getTitle());
        sectionUpdate.setDescription(request.getDescription());

        Section updatedSection = sectionService.updateSection(sectionId, sectionUpdate, instructorId);

        return ResponseEntity.ok(ApiResponse.success(
                "Section updated successfully",
                toResponse(updatedSection)
        ));
    }

    @DeleteMapping("/{sectionId}")
    @PreAuthorize("hasRole('TEACHER')")
    public ResponseEntity<ApiResponse<Void>> deleteSection(
            @PathVariable Long sectionId,
            Authentication authentication) {

        Long instructorId = extractUserId(authentication);
        sectionService.deleteSection(sectionId, instructorId);

        return ResponseEntity.ok(ApiResponse.success("Section deleted successfully", null));
    }

    @GetMapping("/{sectionId}")
    public ResponseEntity<ApiResponse<SectionResponse>> getSectionById(@PathVariable Long sectionId) {
        Section section = sectionService.getSectionById(sectionId);
        return ResponseEntity.ok(ApiResponse.success(toResponse(section)));
    }

    @GetMapping("/{sectionId}/detail")
    public ResponseEntity<ApiResponse<SectionDetailResponse>> getSectionDetail(@PathVariable Long sectionId) {
        Section section = sectionService.getSectionById(sectionId);
        return ResponseEntity.ok(ApiResponse.success(toDetailResponse(section)));
    }

    @GetMapping("/courses/{courseId}")
    public ResponseEntity<ApiResponse<List<SectionResponse>>> getCourseSections(@PathVariable Long courseId) {
        List<Section> sections = sectionService.getCourseSections(courseId);
        List<SectionResponse> response = sections.stream()
                .map(this::toResponse)
                .collect(Collectors.toList());

        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/courses/{courseId}/detail")
    public ResponseEntity<ApiResponse<List<SectionDetailResponse>>> getCourseSectionsWithLessons(
            @PathVariable Long courseId) {
        List<Section> sections = sectionService.getCourseSections(courseId);
        List<SectionDetailResponse> response = sections.stream()
                .map(this::toDetailResponse)
                .collect(Collectors.toList());

        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PutMapping("/courses/{courseId}/reorder")
    @PreAuthorize("hasRole('TEACHER')")
    public ResponseEntity<ApiResponse<Void>> reorderSections(
            @PathVariable Long courseId,
            @Valid @RequestBody ReorderSectionsRequest request,
            Authentication authentication) {

        Long instructorId = extractUserId(authentication);
        sectionService.reorderSections(courseId, request.getSectionIds(), instructorId);

        return ResponseEntity.ok(ApiResponse.success("Sections reordered successfully", null));
    }

    // Helper methods
    private Long extractUserId(Authentication authentication) {
        return Long.parseLong(authentication.getName());
    }

    // FIXED: Calculate duration in seconds from videoDuration
    private SectionResponse toResponse(Section section) {
        List<com.edumind.lms.modules.course.entity.Lesson> lessons =
                lessonService.getSectionLessons(section.getId());

        int lessonCount = lessons.size();
        // FIXED: videoDuration is in seconds
        int totalDurationSeconds = lessons.stream()
                .mapToInt(l -> l.getVideoDuration() != null ? l.getVideoDuration() : 0)
                .sum();

        return SectionResponse.builder()
                .id(section.getId())
                .courseId(section.getCourse().getId())
                .title(section.getTitle())
                .description(section.getDescription())
                .orderIndex(section.getOrderIndex())
                .lessonCount(lessonCount)
                .totalDurationMinutes(totalDurationSeconds / 60) // Convert to minutes for display
                .createdAt(section.getCreatedAt())
                .updatedAt(section.getUpdatedAt())
                .build();
    }

    private SectionDetailResponse toDetailResponse(Section section) {
        List<com.edumind.lms.modules.course.entity.Lesson> lessons =
                lessonService.getSectionLessons(section.getId());

        return SectionDetailResponse.builder()
                .id(section.getId())
                .courseId(section.getCourse().getId())
                .title(section.getTitle())
                .description(section.getDescription())
                .orderIndex(section.getOrderIndex())
                .lessons(lessons.stream()
                        .map(this::toLessonResponse)
                        .collect(Collectors.toList()))
                .createdAt(section.getCreatedAt())
                .updatedAt(section.getUpdatedAt())
                .build();
    }

    // FIXED: Map lesson with correct entity fields
    private com.edumind.lms.modules.course.dto.response.LessonResponse toLessonResponse(
            com.edumind.lms.modules.course.entity.Lesson lesson) {
        return com.edumind.lms.modules.course.dto.response.LessonResponse.builder()
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
