package com.edumind.lms.modules.payment.repository;

import com.edumind.lms.config.BaseRepositoryTest;
import com.edumind.lms.modules.payment.entity.PlatformConfig;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("PlatformConfigRepository Tests")
class PlatformConfigRepositoryTest extends BaseRepositoryTest {

    @Autowired
    private PlatformConfigRepository configRepository;

    @Autowired
    private TestEntityManager entityManager;

    @Test
    @DisplayName("Should find config by key")
    void findByConfigKey_WhenExists_ShouldReturnConfig() {
        // Given
        PlatformConfig config = PlatformConfig.builder()
                .configKey("revenue_share")
                .configValue("20")
                .description("Platform revenue share percentage")
                .build();
        entityManager.persist(config);
        entityManager.flush();

        // When
        Optional<PlatformConfig> result = configRepository.findByConfigKey("revenue_share");

        // Then
        assertThat(result).isPresent();
        assertThat(result.get().getConfigValue()).isEqualTo("20");
    }

    @Test
    @DisplayName("Should check if config key exists")
    void existsByConfigKey_WhenExists_ShouldReturnTrue() {
        // Given
        PlatformConfig config = PlatformConfig.builder()
                .configKey("test_key")
                .configValue("true")
                .build();
        entityManager.persist(config);
        entityManager.flush();

        // When/Then
        assertThat(configRepository.existsByConfigKey("test_key")).isTrue();
        assertThat(configRepository.existsByConfigKey("non_existent")).isFalse();
    }
}
