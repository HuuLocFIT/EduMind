package com.edumind.lms.modules.course.dto.model;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class InstructorStatsProjection {
    private Long instructorId;
    private Long totalCourses;
    private Long totalStudents;
    private Double averageRating;
    private Long totalReviews;
}