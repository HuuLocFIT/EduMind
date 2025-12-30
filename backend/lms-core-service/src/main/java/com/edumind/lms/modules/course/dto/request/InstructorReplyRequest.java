package com.edumind.lms.modules.course.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InstructorReplyRequest {
    @NotBlank(message = "Reply cannot be empty")
    @Size(min = 10, max = 1000, message = "Reply must be between 10 and 1000 characters")
    private String reply;
}
