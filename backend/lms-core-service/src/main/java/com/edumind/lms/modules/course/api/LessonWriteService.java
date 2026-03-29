package com.edumind.lms.modules.course.api;

/**
 * Cross-module write boundary for lesson content updates.
 *
 * <p>AI module should depend on this interface, not course internals.</p>
 */
public interface LessonWriteService {

    /**
     * Update article content for a lesson. Publishes {@code LessonContentUpdatedEvent} when content changes.
     */
    void updateArticleContent(Long lessonId, String content);

    /**
     * Persist the WebVTT caption URL produced by transcription. Does not trigger re-embedding.
     */
    void updateCaptionUrl(Long lessonId, String captionUrl);
}

