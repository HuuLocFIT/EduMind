package com.edumind.lms.modules.course.util;

import com.edumind.lms.modules.course.dto.response.LessonProgressResponse;
import com.edumind.lms.modules.course.entity.LessonProgress;
import org.springframework.stereotype.Component;

@Component
public class LessonProgressMapper {
    public LessonProgressResponse toResponse(LessonProgress progress) {
        return LessonProgressResponse.builder()
                .id(progress.getId())
                .enrollmentId(progress.getEnrollment().getId())
                .lessonId(progress.getLesson().getId())
                .lessonTitle(progress.getLesson().getTitle())
                .studentId(progress.getStudentId())
                .isCompleted(progress.getIsCompleted())
                .completedAt(progress.getCompletedAt())
                .watchDuration(progress.getWatchDuration())
                .lastPosition(progress.getLastPosition())
                .watchPercentage(progress.getWatchPercentage())
                .startedAt(progress.getStartedAt())
                .updatedAt(progress.getUpdatedAt())
                .build();
    }
}
