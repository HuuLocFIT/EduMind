package com.edumind.lms.modules.payment.repository;

import com.edumind.lms.modules.payment.entity.InstructorPayoutSettings;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface InstructorPayoutSettingsRepository extends JpaRepository<InstructorPayoutSettings, Long> {

    Optional<InstructorPayoutSettings> findByInstructorId(Long instructorId);
}

