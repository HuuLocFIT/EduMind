package com.edumind.lms.modules.course.util;

import com.edumind.lms.modules.course.dto.request.CreateCourseRequest;
import com.edumind.lms.modules.course.dto.request.UpdateCourseRequest;
import com.edumind.lms.modules.course.dto.response.CourseDetailResponse;
import com.edumind.lms.modules.course.dto.response.CourseResponse;
import com.edumind.lms.modules.course.dto.response.LessonResponse;
import com.edumind.lms.modules.course.dto.response.SectionDetailResponse;
import com.edumind.lms.modules.course.entity.Category;
import com.edumind.lms.modules.course.entity.Course;
import com.edumind.lms.modules.course.entity.Lesson;
import com.edumind.lms.modules.course.entity.Section;
import org.springframework.stereotype.Component;

import java.util.Collections;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

@Component
public class CourseMapper {
    /**
     * Convert CreateCourseRequest to Course entity
     */
    public Course toEntity(CreateCourseRequest request, Category category, String instructorName) {
        return Course.builder()
                .title(request.getTitle())
                .slug(request.getSlug())
                .description(request.getDescription())
                .shortDescription(request.getShortDescription())
                .instructorName(instructorName)
                .category(category)
                .price(request.getPrice())
                .discountPrice(request.getDiscountPrice())
                .currency(request.getCurrency())
                .thumbnailUrl(request.getThumbnailUrl())
                .previewVideoUrl(request.getPreviewVideoUrl())
                .level(request.getLevel())
                .language(request.getLanguage())
                .durationHours(request.getDurationHours())
                .hasCertificate(request.getHasCertificate())
                .hasSubtitles(request.getHasSubtitles())
                .metaTitle(request.getMetaTitle())
                .metaDescription(request.getMetaDescription())
                .metaKeywords(request.getMetaKeywords())
                .build();
    }

    /**
     * Update Course entity from UpdateCourseRequest
     */
    public Course updateEntity(Course course, UpdateCourseRequest request) {
        if (request.getTitle() != null) course.setTitle(request.getTitle());
        if (request.getSlug() != null) course.setSlug(request.getSlug());
        if (request.getDescription() != null) course.setDescription(request.getDescription());
        if (request.getShortDescription() != null) course.setShortDescription(request.getShortDescription());
        if (request.getPrice() != null) course.setPrice(request.getPrice());
        if (request.getDiscountPrice() != null) course.setDiscountPrice(request.getDiscountPrice());
        if (request.getThumbnailUrl() != null) course.setThumbnailUrl(request.getThumbnailUrl());
        if (request.getPreviewVideoUrl() != null) course.setPreviewVideoUrl(request.getPreviewVideoUrl());
        if (request.getLevel() != null) course.setLevel(request.getLevel());
        if (request.getLanguage() != null) course.setLanguage(request.getLanguage());
        if (request.getDurationHours() != null) course.setDurationHours(request.getDurationHours());
        if (request.getHasCertificate() != null) course.setHasCertificate(request.getHasCertificate());
        if (request.getHasSubtitles() != null) course.setHasSubtitles(request.getHasSubtitles());
        if (request.getMetaTitle() != null) course.setMetaTitle(request.getMetaTitle());
        if (request.getMetaDescription() != null) course.setMetaDescription(request.getMetaDescription());
        if (request.getMetaKeywords() != null) course.setMetaKeywords(request.getMetaKeywords());

        return course;
    }

    /**
     * Convert Course entity to CourseResponse
     */
    public CourseResponse toResponse(Course course) {
        return CourseResponse.builder()
                .id(course.getId())
                .title(course.getTitle())
                .slug(course.getSlug())
                .shortDescription(course.getShortDescription())
                .instructorId(course.getInstructorId())
                .instructorName(course.getInstructorName())
                .categoryId(course.getCategory().getId())
                .categoryName(course.getCategory().getName())
                .price(course.getPrice())
                .currency(course.getCurrency())
                .discountPrice(course.getDiscountPrice())
                .effectivePrice(course.getEffectivePrice())
                .thumbnailUrl(course.getThumbnailUrl())
                .previewVideoUrl(course.getPreviewVideoUrl())
                .level(course.getLevel())
                .language(course.getLanguage())
                .durationHours(course.getDurationHours())
                .status(course.getStatus())
                .publishedAt(course.getPublishedAt())
                .hasCertificate(course.getHasCertificate())
                .hasSubtitles(course.getHasSubtitles())
                .totalLessons(course.getTotalLessons())
                .totalStudents(course.getTotalStudents())
                .averageRating(course.getAverageRating())
                .totalReviews(course.getTotalReviews())
                .createdAt(course.getCreatedAt())
                .updatedAt(course.getUpdatedAt())
                .build();
    }

    /**
     * Convert Course entity to CourseDetailResponse (with sections)
     */
    public CourseDetailResponse toDetailResponse(Course course, CategoryMapper categoryMapper) {
        return CourseDetailResponse.builder()
                .id(course.getId())
                .title(course.getTitle())
                .slug(course.getSlug())
                .description(course.getDescription())
                .shortDescription(course.getShortDescription())
                .instructorId(course.getInstructorId())
                .instructorName(course.getInstructorName())
                .category(categoryMapper.toResponse(course.getCategory()))
                .price(course.getPrice())
                .currency(course.getCurrency())
                .discountPrice(course.getDiscountPrice())
                .effectivePrice(course.getEffectivePrice())
                .thumbnailUrl(course.getThumbnailUrl())
                .previewVideoUrl(course.getPreviewVideoUrl())
                .level(course.getLevel())
                .language(course.getLanguage())
                .durationHours(course.getDurationHours())
                .status(course.getStatus())
                .publishedAt(course.getPublishedAt())
                .hasCertificate(course.getHasCertificate())
                .hasSubtitles(course.getHasSubtitles())
                .metaTitle(course.getMetaTitle())
                .metaDescription(course.getMetaDescription())
                .metaKeywords(course.getMetaKeywords())
                .totalLessons(course.getTotalLessons())
                .totalStudents(course.getTotalStudents())
                .averageRating(course.getAverageRating())
                .totalReviews(course.getTotalReviews())
                .sections(mapSections(course.getSections()))
                .createdAt(course.getCreatedAt())
                .updatedAt(course.getUpdatedAt())
                .build();
    }

    private List<SectionDetailResponse> mapSections(List<Section> sections) {
        if (sections == null) {
            return Collections.emptyList();
        }

        return sections.stream()
                .filter(Objects::nonNull)
                .map(this::mapSection)
                .collect(Collectors.toList());
    }

    private SectionDetailResponse mapSection(Section section) {
        List<Lesson> lessons = section.getLessons() != null ? section.getLessons() : Collections.emptyList();
        List<LessonResponse> lessonResponses = mapLessons(lessons);

        Integer totalDurationMinutes = lessons.stream()
                .filter(Objects::nonNull)
                .map(Lesson::getVideoDuration)
                .filter(Objects::nonNull)
                .mapToInt(Integer::intValue)
                .sum();
        // convert seconds to minutes (rounded up to nearest minute)
        if (totalDurationMinutes != null && totalDurationMinutes > 0) {
            totalDurationMinutes = (int) Math.ceil(totalDurationMinutes / 60.0);
        }

        return SectionDetailResponse.builder()
                .id(section.getId())
                .courseId(section.getCourse() != null ? section.getCourse().getId() : null)
                .title(section.getTitle())
                .description(section.getDescription())
                .orderIndex(section.getOrderIndex())
                .lessonCount(lessons.size())
                .totalDurationMinutes(totalDurationMinutes)
                .lessons(lessonResponses)
                .createdAt(section.getCreatedAt())
                .updatedAt(section.getUpdatedAt())
                .build();
    }

    private List<LessonResponse> mapLessons(List<Lesson> lessons) {
        if (lessons == null) {
            return Collections.emptyList();
        }

        return lessons.stream()
                .filter(Objects::nonNull)
                .map(this::mapLesson)
                .collect(Collectors.toList());
    }

    private LessonResponse mapLesson(Lesson lesson) {
        return LessonResponse.builder()
                .id(lesson.getId())
                .sectionId(lesson.getSection() != null ? lesson.getSection().getId() : null)
                .courseId(lesson.getCourse() != null ? lesson.getCourse().getId() : null)
                .title(lesson.getTitle())
                .description(lesson.getDescription())
                .contentType(lesson.getContentType())
                // Do not expose heavy media URLs in course detail metadata
                .videoUrl(null)
                .videoDuration(lesson.getVideoDuration())
                // Metadata-only: omit article content and resources
                .articleContent(null)
                .resources(null)
                .orderIndex(lesson.getOrderIndex())
                .isPreview(lesson.getIsPreview())
                .isMandatory(lesson.getIsMandatory())
                .createdAt(lesson.getCreatedAt())
                .updatedAt(lesson.getUpdatedAt())
                .build();
    }
}
