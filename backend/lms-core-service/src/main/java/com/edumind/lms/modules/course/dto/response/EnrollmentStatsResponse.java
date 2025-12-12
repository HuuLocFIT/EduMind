package com.edumind.lms.modules.course.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class EnrollmentStatsResponse {
    /**
     * Total number of enrollments
     */
    private Long total;

    /**
     * Number of active/in-progress enrollments
     */
    private Long active;

    /**
     * Number of completed enrollments
     */
    private Long completed;

    /**
     * Number of enrollments with progress > 0
     */
    private Long started;
}

