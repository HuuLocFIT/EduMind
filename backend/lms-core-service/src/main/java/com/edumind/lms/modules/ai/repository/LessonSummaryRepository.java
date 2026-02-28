package com.edumind.lms.modules.ai.repository;

import com.edumind.lms.modules.ai.entity.LessonSummary;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

public interface LessonSummaryRepository extends JpaRepository<LessonSummary, Long> {

    Optional<LessonSummary> findByLessonId(Long lessonId);

    @Transactional
    @Modifying
    @Query(value = """
            INSERT INTO ai.lesson_summaries (lesson_id, job_id, summary_text, key_points, vocabulary, created_at, updated_at)
            VALUES (:lessonId, :jobId, :summaryText, CAST(:keyPointsJson AS jsonb), CAST(:vocabularyJson AS jsonb), NOW(), NOW())
            ON CONFLICT (lesson_id) DO UPDATE
            SET job_id = :jobId,
                summary_text = :summaryText,
                key_points = CAST(:keyPointsJson AS jsonb),
                vocabulary = CAST(:vocabularyJson AS jsonb),
                updated_at = NOW()
            """, nativeQuery = true)
    void upsert(@Param("lessonId") Long lessonId,
                @Param("jobId") Long jobId,
                @Param("summaryText") String summaryText,
                @Param("keyPointsJson") String keyPointsJson,
                @Param("vocabularyJson") String vocabularyJson);
}

