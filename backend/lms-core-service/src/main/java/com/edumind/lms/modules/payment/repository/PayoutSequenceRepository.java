package com.edumind.lms.modules.payment.repository;

import com.edumind.lms.modules.payment.entity.PayoutSequence;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface PayoutSequenceRepository extends JpaRepository<PayoutSequence, Long> {
    Optional<PayoutSequence> findByYearMonth(String yearMonth);
}
