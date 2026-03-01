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
public class TeacherCourseStatResponse {
    private Long courseId;
    private String title;
    private Long totalStudents;
    private BigDecimal averageRating;
    private BigDecimal netEarnings;
    private Double completionRate;
    private String status;
}
