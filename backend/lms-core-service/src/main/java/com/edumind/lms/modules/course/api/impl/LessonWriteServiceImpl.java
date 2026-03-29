package com.edumind.lms.modules.course.api.impl;

import com.edumind.lms.modules.course.api.LessonWriteService;
import com.edumind.lms.modules.course.entity.Lesson;
import com.edumind.lms.modules.course.event.LessonContentUpdatedEvent;
import com.edumind.lms.modules.course.repository.LessonRepository;
import com.edumind.lms.shared.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Objects;

@Slf4j
@Service
@RequiredArgsConstructor
public class LessonWriteServiceImpl implements LessonWriteService {

    private final LessonRepository lessonRepository;
    private final ApplicationEventPublisher eventPublisher;

    @Override
    @Transactional
    public void updateCaptionUrl(Long lessonId, String captionUrl) {
        Lesson lesson = lessonRepository.findById(lessonId)
                .orElseThrow(() -> new ResourceNotFoundException("Lesson not found with ID: " + lessonId));
        lesson.setVideoCaptionUrl(captionUrl);
        lessonRepository.save(lesson);
        log.info("Saved caption URL for lesson {}", lessonId);
    }

    @Override
    @Transactional
    public void updateArticleContent(Long lessonId, String content) {
        Lesson lesson = lessonRepository.findById(lessonId)
                .orElseThrow(() -> new ResourceNotFoundException("Lesson not found with ID: " + lessonId));

        String oldContent = lesson.getArticleContent();
        lesson.setArticleContent(content);
        Lesson saved = lessonRepository.save(lesson);

        if (!Objects.equals(oldContent, content)) {
            eventPublisher.publishEvent(new LessonContentUpdatedEvent(this, saved));
            log.info("LessonContentUpdatedEvent published for lesson {}", saved.getId());
        } else {
            log.debug("Skipping LessonContentUpdatedEvent — articleContent unchanged for lesson {}", saved.getId());
        }
    }
}

