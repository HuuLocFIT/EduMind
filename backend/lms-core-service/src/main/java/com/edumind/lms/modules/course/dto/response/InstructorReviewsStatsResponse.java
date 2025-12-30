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
public class InstructorReviewsStatsResponse {
    private Long totalReviews;
    private Double averageRating;
    private Long repliedCount;
    private Long needReplyCount;
    private Map<Integer, Long> ratingDistribution;  // rating -> count
}
