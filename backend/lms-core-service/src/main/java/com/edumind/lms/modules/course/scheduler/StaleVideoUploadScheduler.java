package com.edumind.lms.modules.course.scheduler;

import com.edumind.lms.modules.course.entity.Lesson;
import com.edumind.lms.modules.course.enums.VideoUploadStatus;
import com.edumind.lms.modules.course.repository.LessonRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Scheduled job to clean up stale video uploads.
 * Lessons stuck in UPLOADING state for more than 2 hours are marked as FAILED.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class StaleVideoUploadScheduler {

    private final LessonRepository lessonRepository;

    @Scheduled(fixedRate = 30 * 60 * 1000) // Every 30 minutes
    @Transactional
    public void cleanupStaleUploads() {
        LocalDateTime cutoff = LocalDateTime.now().minusHours(2);
        List<Lesson> staleUploads = lessonRepository.findStaleUploads(cutoff, VideoUploadStatus.UPLOADING);

        if (staleUploads.isEmpty()) {
            log.debug("No stale video uploads found during scheduled cleanup");
            return;
        }

        log.info("Found {} stale video uploads to clean up", staleUploads.size());

        int cleanedCount = 0;
        for (Lesson lesson : staleUploads) {
            try {
                lesson.setVideoUploadStatus(VideoUploadStatus.FAILED);
                lessonRepository.save(lesson);
                cleanedCount++;
                log.info("Marked stale upload as FAILED for lesson {}", lesson.getId());
            } catch (Exception e) {
                log.error("Failed to clean up stale upload for lesson {}: {}", lesson.getId(), e.getMessage());
            }
        }

        log.info("Successfully cleaned up {} stale video uploads", cleanedCount);
    }
}
