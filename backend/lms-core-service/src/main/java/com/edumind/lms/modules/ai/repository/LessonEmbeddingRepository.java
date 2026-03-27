package com.edumind.lms.modules.ai.repository;

import com.edumind.lms.modules.ai.entity.LessonEmbedding;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;

public interface LessonEmbeddingRepository extends JpaRepository<LessonEmbedding, Long> {

    @Query("SELECT DISTINCT l.lessonId FROM LessonEmbedding l")
    Set<Long> findAllIndexedLessonIds();

    @Transactional
    void deleteByLessonId(Long lessonId);

    @Transactional
    @Modifying
    @Query(value = """
            INSERT INTO ai.lesson_embeddings (lesson_id, course_id, chunk_index, chunk_text, embedding, created_at)
            VALUES (:lessonId, :courseId, :chunkIndex, :chunkText, CAST(:embedding AS vector), NOW())
            """, nativeQuery = true)
    void insertChunk(@Param("lessonId") Long lessonId,
                     @Param("courseId") Long courseId,
                     @Param("chunkIndex") int chunkIndex,
                     @Param("chunkText") String chunkText,
                     @Param("embedding") String embedding);

    @Query(value = """
            SELECT id,
                   lesson_id AS lessonId,
                   course_id AS courseId,
                   chunk_index AS chunkIndex,
                   chunk_text AS chunkText,
                   embedding <=> CAST(:queryEmbedding AS vector) AS distance
            FROM ai.lesson_embeddings
            WHERE course_id = :courseId
            ORDER BY distance
            LIMIT :k
            """, nativeQuery = true)
    List<LessonChunkProjection> findTopK(@Param("courseId") Long courseId,
                                         @Param("queryEmbedding") String queryEmbedding,
                                         @Param("k") int k);
}

