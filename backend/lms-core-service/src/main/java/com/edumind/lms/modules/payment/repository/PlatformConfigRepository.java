package com.edumind.lms.modules.payment.repository;

import com.edumind.lms.modules.payment.entity.PlatformConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface PlatformConfigRepository extends JpaRepository<PlatformConfig, Long> {
    Optional<PlatformConfig> findByConfigKey(String configKey);

    boolean existsByConfigKey(String configKey);
}
