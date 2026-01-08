package com.edumind.lms.modules.payment.service;

import java.math.BigDecimal;

/**
 * Service to manage platform configuration values.
 * Values are stored in payment.platform_config table.
 */
public interface PlatformConfigService {

    /**
     * Get platform fee percentage (e.g., 20%)
     */
    BigDecimal getPlatformFeePercent();

    /**
     * Get minimum course price in USD
     */
    BigDecimal getMinCoursePrice();

    /**
     * Get maximum course price in USD
     */
    BigDecimal getMaxCoursePrice();

    /**
     * Get a config value by key
     */
    String getConfigValue(String key);

    /**
     * Get a config value with default
     */
    String getConfigValue(String key, String defaultValue);

    /**
     * Update a config value (admin only)
     */
    void updateConfigValue(String key, String value);
}
