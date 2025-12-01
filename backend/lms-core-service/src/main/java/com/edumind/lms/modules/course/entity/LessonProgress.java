package com.edumind.lms.modules.course.entity;

import com.edumind.lms.shared.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "lesson_progress", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"enrollment_id", "lesson_id"})
}, schema = "course")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LessonProgress extends BaseEntity {
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "enrollment_id", nullable = false)
    private Enrollment enrollment;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "lesson_id", nullable = false)
    private Lesson lesson;

    @Column(nullable = false)
    private Long studentId;

    // Progress
    @Column(nullable = false)
    private Boolean isCompleted = false;

    private LocalDateTime completedAt;

    // Video progress
    private Integer watchDuration = 0; // seconds watched
    private Integer lastPosition = 0;  // last video position

    // Timestamps
    @Column(nullable = false)
    private LocalDateTime startedAt = LocalDateTime.now();

    // Helper methods
    public void markAsCompleted() {
        this.isCompleted = true;
        this.completedAt = LocalDateTime.now();
    }

    public double getWatchPercentage() {
        if (lesson.getVideoDuration() == null || lesson.getVideoDuration() == 0) {
            return 0.0;
        }
        return (watchDuration * 100.0) / lesson.getVideoDuration();
    }
}