package com.edumind.lms.modules.course.entity;

import com.edumind.lms.modules.course.enums.EnrollmentStatus;
import com.edumind.lms.shared.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "enrollments", uniqueConstraints = {
        @UniqueConstraint(columnNames = { "course_id", "student_id" })
}, schema = "course")
@NamedEntityGraphs({
        @NamedEntityGraph(name = "Enrollment.withCourse", attributeNodes = @NamedAttributeNode("course"))
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Enrollment extends BaseEntity {
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "course_id", nullable = false)
    private Course course;

    @Column(nullable = false)
    private Long studentId;

    // Progress
    @Column(nullable = false)
    private Integer progressPercentage = 0;

    @Column(nullable = false)
    private Integer completedLessons = 0;

    @Column(nullable = false)
    private Integer totalLessons;

    // Status
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private EnrollmentStatus status = EnrollmentStatus.ACTIVE;

    // Completion
    private LocalDateTime completedAt;
    private LocalDateTime certificateIssuedAt;
    private String certificateUrl;
    @Column(length = 50)
    private String certificateReference;

    // Timestamps
    @Column(nullable = false)
    private LocalDateTime enrolledAt = LocalDateTime.now();

    private LocalDateTime lastAccessedAt = LocalDateTime.now();
    private LocalDateTime expiresAt;

    // Suspension reason (for audit/logging purposes)
    @Column(length = 500)
    private String suspensionReason;

    @OneToMany(mappedBy = "enrollment", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<LessonProgress> lessonProgresses = new ArrayList<>();

    // Helper methods
    public boolean isCompleted() {
        return status == EnrollmentStatus.COMPLETED || progressPercentage >= 100;
    }

    public boolean isActive() {
        return status == EnrollmentStatus.ACTIVE;
    }
}
