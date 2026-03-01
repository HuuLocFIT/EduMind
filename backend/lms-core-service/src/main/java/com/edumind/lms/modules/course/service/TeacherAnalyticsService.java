package com.edumind.lms.modules.course.service;

import com.edumind.lms.modules.course.dto.response.TeacherAnalyticsResponse;

public interface TeacherAnalyticsService {
    TeacherAnalyticsResponse getAnalytics(Long instructorId);
}
