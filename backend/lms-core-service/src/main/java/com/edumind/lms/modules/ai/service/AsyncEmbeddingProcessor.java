package com.edumind.lms.modules.ai.service;

import com.edumind.lms.modules.ai.enums.AiJobStatus;
import com.edumind.lms.modules.ai.repository.LessonEmbeddingRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.embedding.EmbeddingModel;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class AsyncEmbeddingProcessor {

    private final AiJobService aiJobService;
    private final LessonEmbeddingRepository lessonEmbeddingRepository;

    @Autowired(required = false)
    private EmbeddingModel embeddingModel;

    @Async("aiTaskExecutor")
    public void process(Long jobId, Long lessonId, Long courseId, String articleContent) {
        log.info("Embedding job {} started for lesson {}", jobId, lessonId);
        if (embeddingModel == null) {
            log.warn("EmbeddingModel bean is not available – skipping embedding job {}", jobId);
            failSilently(jobId, "Embedding model not configured");
            return;
        }

        try {
            aiJobService.updateStatus(jobId, AiJobStatus.PROCESSING, null);

            // 1. Delete existing chunks for this lesson (re-embedding)
            lessonEmbeddingRepository.deleteByLessonId(lessonId);

            // 2. Chunk text
            List<String> chunks = splitIntoChunks(articleContent, 500, 50);
            log.info("Embedding job {} – {} chunks for lesson {}", jobId, chunks.size(), lessonId);

            // 3. Embed and insert each chunk
            for (int i = 0; i < chunks.size(); i++) {
                String chunkText = chunks.get(i);
                float[] vector = embeddingModel.embed(chunkText);
                String vectorStr = Arrays.toString(vector);
                lessonEmbeddingRepository.insertChunk(lessonId, courseId, i, chunkText, vectorStr);
            }

            aiJobService.updateStatus(jobId, AiJobStatus.COMPLETED, null);
            log.info("Embedding job {} completed for lesson {}", jobId, lessonId);
        } catch (Exception e) {
            log.error("Lesson embedding generation failed for job {}: {}", jobId, e.getMessage(), e);
            String msg = e.getMessage();
            if (msg != null && msg.length() > 500) {
                msg = msg.substring(0, 500) + "...";
            }
            failSilently(jobId, msg);
        }
    }

    private void failSilently(Long jobId, String reason) {
        try {
            aiJobService.updateStatus(jobId, AiJobStatus.FAILED, reason);
        } catch (Exception ex) {
            log.error("Could not mark embedding job {} as FAILED: {}", jobId, ex.getMessage());
        }
    }

    /**
     * Split text into overlapping chunks of approximately targetWords size,
     * with overlapWords carried from the previous chunk.
     */
    List<String> splitIntoChunks(String text, int targetWords, int overlapWords) {
        if (text == null || text.isBlank()) {
            return List.of();
        }

        // First split by paragraph / sentence boundaries
        String[] rawSegments = text.split("(\\n\\n+|\\.\\s+)");
        List<String> chunks = new ArrayList<>();

        List<String> currentWords = new ArrayList<>();
        for (String segment : rawSegments) {
            String trimmed = segment.trim();
            if (trimmed.isEmpty()) {
                continue;
            }
            String[] words = trimmed.split("\\s+");
            currentWords.addAll(Arrays.asList(words));

            while (currentWords.size() >= targetWords) {
                // Emit a chunk of approximately targetWords
                List<String> chunkWords = new ArrayList<>(currentWords.subList(0, targetWords));
                chunks.add(String.join(" ", chunkWords));

                // Prepare next chunk with overlap
                int start = Math.max(0, targetWords - overlapWords);
                currentWords = new ArrayList<>(currentWords.subList(start, currentWords.size()));
            }
        }

        if (!currentWords.isEmpty()) {
            chunks.add(String.join(" ", currentWords));
        }

        return chunks;
    }
}

