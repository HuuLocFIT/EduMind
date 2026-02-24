package com.edumind.lms.modules.course.api.impl;

import com.edumind.lms.modules.course.api.LessonQueryService;
import com.edumind.lms.modules.course.api.dto.LessonInfo;
import com.edumind.lms.modules.course.entity.Lesson;
import com.edumind.lms.modules.course.repository.LessonRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class LessonQueryServiceImpl implements LessonQueryService {

    private final LessonRepository lessonRepository;

    @Override
    public Optional<LessonInfo> getLessonInfo(Long lessonId) {
        return lessonRepository.findById(lessonId).map(this::toInfo);
    }

    private LessonInfo toInfo(Lesson lesson) {
        return new LessonInfo(
                lesson.getId(),
                lesson.getTitle(),
                lesson.getArticleContent(),
                lesson.getCourse().getId(),
                lesson.getSection().getCourse().getInstructorId()
        );
    }
}
