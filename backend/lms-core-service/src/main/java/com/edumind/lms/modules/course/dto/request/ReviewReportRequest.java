package com.edumind.lms.modules.course.dto.request;

import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReviewReportRequest {
    @Size(max = 1000, message = "Admin notes must not exceed 1000 characters")
    private String adminNotes;
}
