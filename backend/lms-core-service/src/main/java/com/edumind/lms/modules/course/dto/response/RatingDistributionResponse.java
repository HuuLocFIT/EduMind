package com.edumind.lms.modules.course.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RatingDistributionResponse {
    private Long courseId;
    private Double averageRating;
    private Long totalReviews;
    private Map<Integer, Long> distribution; // rating -> count
}
