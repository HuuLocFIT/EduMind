package com.edumind.lms.modules.course.dto.response;

import com.edumind.lms.modules.course.enums.CourseLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WishlistItemResponse {
    private Long id;
    private Long courseId;
    private String courseTitle;
    private String courseSlug;
    private String thumbnailUrl;
    private BigDecimal price;
    private BigDecimal discountPrice;
    private CourseLevel level;
    private Long instructorId;
    private String instructorName;
    private Double rating;
    private Long reviewCount;
    private LocalDateTime addedAt;
}
