package com.edumind.lms.modules.ai.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;

@Entity
@Table(name = "generated_quizzes", schema = "ai")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GeneratedQuiz {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "lesson_id", nullable = false)
    private Long lessonId;

    @Column(name = "job_id", nullable = false)
    private Long jobId;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "questions_json", columnDefinition = "jsonb", nullable = false)
    private String questionsJson;  // serialized JSON; deserialized at service layer

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
