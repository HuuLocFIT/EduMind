package com.edumind.lms.modules.course.dto.response;

import com.edumind.lms.modules.course.enums.CourseLevel;
import com.edumind.lms.modules.course.enums.CourseStatus;
import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class CourseDetailResponse {
    private Long id;
    private String title;
    private String slug;
    private String description;
    private String shortDescription;

    // Instructor info
    private Long instructorId;
    private String instructorName;

    // Category
    private CategoryResponse category;

    // Pricing
    private BigDecimal price;
    private String currency;
    private BigDecimal discountPrice;
    private BigDecimal effectivePrice;

    // Media
    private String thumbnailUrl;
    private String previewVideoUrl;

    // Details
    private CourseLevel level;
    private String language;
    private Integer durationHours;

    // Status
    private CourseStatus status;
    private LocalDateTime publishedAt;

    // Features
    private Boolean hasCertificate;
    private Boolean hasSubtitles;

    // SEO
    private String metaTitle;
    private String metaDescription;
    private String metaKeywords;

    // Statistics
    private Integer totalLessons;
    private Integer totalStudents;
    private BigDecimal averageRating;
    private Integer totalReviews;

    // Course structure (sections with lessons)
    private List<SectionResponse> sections;

    // Timestamps
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
