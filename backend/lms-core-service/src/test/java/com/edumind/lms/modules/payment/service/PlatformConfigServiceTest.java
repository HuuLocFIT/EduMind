package com.edumind.lms.modules.payment.service;

import com.edumind.lms.modules.payment.entity.PlatformConfig;
import com.edumind.lms.modules.payment.repository.PlatformConfigRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("PlatformConfigService Unit Tests")
class PlatformConfigServiceTest {

    @Mock
    private PlatformConfigRepository configRepository;

    @InjectMocks
    private PlatformConfigServiceImpl platformConfigService;

    private PlatformConfig feeConfig;
    private PlatformConfig minPriceConfig;
    private PlatformConfig maxPriceConfig;

    @BeforeEach
    void setUp() {
        feeConfig = new PlatformConfig();
        feeConfig.setId(1L);
        feeConfig.setConfigKey("PLATFORM_FEE_PERCENT");
        feeConfig.setConfigValue("30");

        minPriceConfig = new PlatformConfig();
        minPriceConfig.setId(2L);
        minPriceConfig.setConfigKey("MIN_COURSE_PRICE");
        minPriceConfig.setConfigValue("5");

        maxPriceConfig = new PlatformConfig();
        maxPriceConfig.setId(3L);
        maxPriceConfig.setConfigKey("MAX_COURSE_PRICE");
        maxPriceConfig.setConfigValue("1000");
    }

    @Nested
    @DisplayName("getPlatformFeePercent Tests")
    class GetPlatformFeePercentTests {

        @Test
        @DisplayName("Should return configured platform fee")
        void getPlatformFeePercent_ConfigExists_ReturnsValue() {
            // Given
            when(configRepository.findByConfigKey("PLATFORM_FEE_PERCENT")).thenReturn(Optional.of(feeConfig));

            // When
            BigDecimal result = platformConfigService.getPlatformFeePercent();

            // Then
            assertThat(result).isEqualByComparingTo("30");
        }

        @Test
        @DisplayName("Should return default fee if not configured")
        void getPlatformFeePercent_NoConfig_ReturnsDefault() {
            // Given
            when(configRepository.findByConfigKey("PLATFORM_FEE_PERCENT")).thenReturn(Optional.empty());

            // When
            BigDecimal result = platformConfigService.getPlatformFeePercent();

            // Then
            assertThat(result).isEqualByComparingTo("20"); // Default
        }
    }

    @Nested
    @DisplayName("getMinCoursePrice Tests")
    class GetMinCoursePriceTests {

        @Test
        @DisplayName("Should return configured min price")
        void getMinCoursePrice_ConfigExists_ReturnsValue() {
            // Given
            when(configRepository.findByConfigKey("MIN_COURSE_PRICE")).thenReturn(Optional.of(minPriceConfig));

            // When
            BigDecimal result = platformConfigService.getMinCoursePrice();

            // Then
            assertThat(result).isEqualByComparingTo("5");
        }
    }

    @Nested
    @DisplayName("getMaxCoursePrice Tests")
    class GetMaxCoursePriceTests {

        @Test
        @DisplayName("Should return configured max price")
        void getMaxCoursePrice_ConfigExists_ReturnsValue() {
            // Given
            when(configRepository.findByConfigKey("MAX_COURSE_PRICE")).thenReturn(Optional.of(maxPriceConfig));

            // When
            BigDecimal result = platformConfigService.getMaxCoursePrice();

            // Then
            assertThat(result).isEqualByComparingTo("1000");
        }
    }

    @Nested
    @DisplayName("getConfigValue Tests")
    class GetConfigValueTests {

        @Test
        @DisplayName("Should return config value by key")
        void getConfigValue_KeyExists_ReturnsValue() {
            // Given
            when(configRepository.findByConfigKey("CUSTOM_KEY")).thenReturn(Optional.of(feeConfig));

            // When
            String result = platformConfigService.getConfigValue("CUSTOM_KEY");

            // Then
            assertThat(result).isEqualTo("30");
        }

        @Test
        @DisplayName("Should return null if key not found")
        void getConfigValue_KeyNotFound_ReturnsNull() {
            // Given
            when(configRepository.findByConfigKey("UNKNOWN")).thenReturn(Optional.empty());

            // When
            String result = platformConfigService.getConfigValue("UNKNOWN");

            // Then
            assertThat(result).isNull();
        }

        @Test
        @DisplayName("Should return default if key not found")
        void getConfigValue_WithDefault_ReturnsDefault() {
            // Given
            when(configRepository.findByConfigKey("UNKNOWN")).thenReturn(Optional.empty());

            // When
            String result = platformConfigService.getConfigValue("UNKNOWN", "default_value");

            // Then
            assertThat(result).isEqualTo("default_value");
        }
    }

    @Nested
    @DisplayName("updateConfigValue Tests")
    class UpdateConfigValueTests {

        @Test
        @DisplayName("Should update existing config")
        void updateConfigValue_ExistingKey_Updates() {
            // Given
            when(configRepository.findByConfigKey("PLATFORM_FEE_PERCENT")).thenReturn(Optional.of(feeConfig));
            when(configRepository.save(any(PlatformConfig.class))).thenReturn(feeConfig);

            // When
            platformConfigService.updateConfigValue("PLATFORM_FEE_PERCENT", "25");

            // Then
            assertThat(feeConfig.getConfigValue()).isEqualTo("25");
            verify(configRepository).save(feeConfig);
        }

        @Test
        @DisplayName("Should create new config if not exists")
        void updateConfigValue_NewKey_Creates() {
            // Given
            when(configRepository.findByConfigKey("NEW_KEY")).thenReturn(Optional.empty());
            when(configRepository.save(any(PlatformConfig.class))).thenAnswer(inv -> inv.getArgument(0));

            // When
            platformConfigService.updateConfigValue("NEW_KEY", "new_value");

            // Then
            verify(configRepository).save(any(PlatformConfig.class));
        }
    }
}
