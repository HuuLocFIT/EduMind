package com.edumind.lms.modules.payment.service;

import com.edumind.lms.modules.payment.entity.PlatformConfig;
import com.edumind.lms.modules.payment.repository.PlatformConfigRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Slf4j
@Service
@RequiredArgsConstructor
public class PlatformConfigServiceImpl implements PlatformConfigService {

    private final PlatformConfigRepository configRepository;

    // Config keys
    public static final String KEY_PLATFORM_FEE_PERCENT = "PLATFORM_FEE_PERCENT";
    public static final String KEY_MIN_COURSE_PRICE = "MIN_COURSE_PRICE";
    public static final String KEY_MAX_COURSE_PRICE = "MAX_COURSE_PRICE";

    // Default values
    private static final BigDecimal DEFAULT_PLATFORM_FEE = new BigDecimal("20");
    private static final BigDecimal DEFAULT_MIN_PRICE = BigDecimal.ZERO;
    private static final BigDecimal DEFAULT_MAX_PRICE = new BigDecimal("500");

    @Override
    @Cacheable(value = "platformConfig", key = "'platformFeePercent'")
    public BigDecimal getPlatformFeePercent() {
        String value = getConfigValue(KEY_PLATFORM_FEE_PERCENT, DEFAULT_PLATFORM_FEE.toString());
        return new BigDecimal(value);
    }

    @Override
    @Cacheable(value = "platformConfig", key = "'minCoursePrice'")
    public BigDecimal getMinCoursePrice() {
        String value = getConfigValue(KEY_MIN_COURSE_PRICE, DEFAULT_MIN_PRICE.toString());
        return new BigDecimal(value);
    }

    @Override
    @Cacheable(value = "platformConfig", key = "'maxCoursePrice'")
    public BigDecimal getMaxCoursePrice() {
        String value = getConfigValue(KEY_MAX_COURSE_PRICE, DEFAULT_MAX_PRICE.toString());
        return new BigDecimal(value);
    }

    @Override
    @Cacheable(value = "platformConfig", key = "#key")
    public String getConfigValue(String key) {
        return configRepository.findByConfigKey(key)
                .map(PlatformConfig::getConfigValue)
                .orElse(null);
    }

    @Override
    public String getConfigValue(String key, String defaultValue) {
        String value = getConfigValue(key);
        return value != null ? value : defaultValue;
    }

    @Override
    @Transactional
    @CacheEvict(value = "platformConfig", allEntries = true)
    public void updateConfigValue(String key, String value) {
        log.info("Updating platform config: {} = {}", key, value);

        PlatformConfig config = configRepository.findByConfigKey(key)
                .orElseGet(() -> {
                    PlatformConfig newConfig = new PlatformConfig();
                    newConfig.setConfigKey(key);
                    return newConfig;
                });

        config.setConfigValue(value);
        config.setUpdatedAt(LocalDateTime.now());

        configRepository.save(config);

        log.info("Platform config updated: {} = {}", key, value);
    }
}
