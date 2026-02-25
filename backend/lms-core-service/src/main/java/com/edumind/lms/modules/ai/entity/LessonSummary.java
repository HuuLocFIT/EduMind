package com.edumind.lms.modules.ai.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;

@Entity
@Table(schema = "ai", name = "lesson_summaries")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LessonSummary {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "lesson_id", nullable = false, unique = true)
    private Long lessonId;

    @Column(name = "job_id", nullable = false)
    private Long jobId;

    @Column(name = "summary_text", nullable = false, columnDefinition = "TEXT")
    private String summaryText;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "key_points", nullable = false, columnDefinition = "jsonb")
    private String keyPointsJson;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "vocabulary", nullable = false, columnDefinition = "jsonb")
    private String vocabularyJson;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    void prePersist() {
        createdAt = updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    void preUpdate() {
        updatedAt = LocalDateTime.now();
    }
}

