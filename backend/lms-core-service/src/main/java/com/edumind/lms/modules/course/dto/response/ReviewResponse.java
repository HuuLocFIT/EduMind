package com.edumind.lms.modules.course.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReviewResponse {
    private Long id;
    private Long courseId;
    private String courseTitle;
    private String courseThumbnailUrl;
    private Long studentId;
    private String studentName;
    private String avatarUrl;
    private String profilePictureUrl;
    private Integer rating;
    private String comment;
    private Boolean isApproved;
    private Boolean isFlagged;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String instructorReply;
    private LocalDateTime instructorReplyAt;
    private Boolean hasReply;
}
