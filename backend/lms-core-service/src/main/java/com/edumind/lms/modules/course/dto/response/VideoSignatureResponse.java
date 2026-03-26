package com.edumind.lms.modules.course.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VideoSignatureResponse {
    private String cloudName;
    private String apiKey;
    private String signature;
    private Long timestamp;
    private String folder;
    private String notificationUrl;
}
