package com.edumind.auth.dto.response;

public record ApplicationStatsResponse(
        long totalPending,
        long totalApproved,
        long totalRejected,
        long totalTrialTeachers,
        long expiringThisWeek,
        long activeTrialTeachers,
        long expiredTrialTeachers
) {}
