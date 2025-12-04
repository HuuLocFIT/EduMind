package com.edumind.lms.modules.course.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InstructorStatsResponse {
    private Long instructorId;
    private String instructorName;
    private String bio;
    private String avatarUrl;

    // Aggregated stats
    private Integer totalCourses;
    private Long totalStudents;
    private BigDecimal averageRating;
    private Long totalReviews;
}