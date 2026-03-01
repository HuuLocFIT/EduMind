package com.edumind.lms.modules.course.controller;

import com.edumind.common.response.ApiResponse;
import com.edumind.lms.modules.course.dto.response.TeacherAnalyticsResponse;
import com.edumind.lms.modules.course.service.TeacherAnalyticsService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/teacher/analytics")
@RequiredArgsConstructor
@Slf4j
@PreAuthorize("@teacherSecurity.isActiveTeacher()")
public class TeacherAnalyticsController {

    private final TeacherAnalyticsService teacherAnalyticsService;

    /**
     * Get teacher analytics
     * GET /teacher/analytics
     */
    @GetMapping
    public ResponseEntity<ApiResponse<TeacherAnalyticsResponse>> getAnalytics(
            Authentication authentication) {

        Long instructorId = extractUserId(authentication);
        log.debug("Teacher {} fetching analytics", instructorId);

        TeacherAnalyticsResponse analytics = teacherAnalyticsService.getAnalytics(instructorId);

        return ResponseEntity.ok(ApiResponse.success(analytics));
    }

    // ==================== Helper Methods ====================

    private Long extractUserId(Authentication authentication) {
        return Long.parseLong(authentication.getName());
    }
}
