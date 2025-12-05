package com.edumind.lms.modules.course.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Configuration properties for course review system
 */
@Data
@Component
@ConfigurationProperties(prefix = "app.review")
public class ReviewConfigProperties {
    /**
     * Enable auto-approval of reviews when created
     * Default: true (reviews are auto-approved)
     */
    private boolean autoApproveEnabled = true;

    /**
     * Minimum rating threshold for auto-approval
     * If set > 0, only reviews with rating >= threshold will be auto-approved
     * Reviews below threshold will require manual approval
     * Default: 0 (all reviews auto-approved regardless of rating)
     */
    private Integer autoApproveThreshold = 0;
}

