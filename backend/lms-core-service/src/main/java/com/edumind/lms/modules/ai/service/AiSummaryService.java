package com.edumind.lms.modules.ai.service;

import com.edumind.lms.modules.ai.dto.response.LessonSummaryResponse;
import com.edumind.lms.modules.course.entity.Lesson;

public interface AiSummaryService {

    /**
     * Called by AiEventListener after lesson content commits.
     */
    void requestSummaryGeneration(Lesson lesson);

    /**
     * Public read endpoint — instructor or enrolled student.
     */
    LessonSummaryResponse getSummaryByLesson(Long lessonId, Long userId);
}

