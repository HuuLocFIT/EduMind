package com.edumind.lms.modules.course.service;

import com.edumind.lms.modules.course.dto.response.DashboardStatsResponse;

public interface DashboardService {
    /**
     * Get dashboard statistics for admin
     */
    DashboardStatsResponse getDashboardStats();
}
