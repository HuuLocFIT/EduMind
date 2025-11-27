package com.edumind.lms.modules.course.entity;

import com.edumind.lms.shared.entity.BaseEntity;
import com.edumind.lms.modules.course.enums.CourseLevel;
import com.edumind.lms.modules.course.enums.CourseStatus;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "courses", schema = "course")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Course extends BaseEntity {
    @Column(nullable = false)
    private String title;

    @Column(nullable = false, unique = true)
    private String slug;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(length = 500)
    private String shortDescription;

    // Instructor (from Auth Service)
    @Column(nullable = false)
    private Long instructorId;

    @Column(nullable = false)
    private String instructorName;

    // Category
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id", nullable = false)
    private Category category;

    // Pricing
    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal price;

    @Column(length = 3)
    private String currency = "USD";

    @Column(precision = 10, scale = 2)
    private BigDecimal discountPrice;

    // Media
    private String thumbnailUrl;
    private String previewVideoUrl;

    // Course details
    @Enumerated(EnumType.STRING)
    private CourseLevel level;

    private String language = "en";
    private Integer durationHours;

    // Status
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private CourseStatus status = CourseStatus.DRAFT;

    // Features
    private Boolean hasCertificate = false;
    private Boolean hasSubtitles = false;

    // SEO
    private String metaTitle;
    private String metaDescription;

    @Column(columnDefinition = "TEXT")
    private String metaKeywords;

    // Statistics
    private Integer totalLessons = 0;
    private Integer totalStudents = 0;

    @Column(precision = 3, scale = 2)
    private BigDecimal averageRating = BigDecimal.ZERO;

    private Integer totalReviews = 0;

    private LocalDateTime publishedAt;

    // Relationships
    @OneToMany(mappedBy = "course", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("orderIndex ASC")
    @Builder.Default
    private List<Section> sections = new ArrayList<>();

    @OneToMany(mappedBy = "course", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<Enrollment> enrollments = new ArrayList<>();

    // Helper methods
    public boolean isPublished() {
        return status == CourseStatus.PUBLISHED && publishedAt != null;
    }

    public boolean isPaid() {
        return price != null && price.compareTo(BigDecimal.ZERO) > 0;
    }

    public BigDecimal getEffectivePrice() {
        return discountPrice != null ? discountPrice : price;
    }
}
