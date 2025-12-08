package com.edumind.auth.repository;

import com.edumind.auth.entity.ApplicationStatusHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ApplicationStatusHistoryRepository extends JpaRepository<ApplicationStatusHistory, Long> {
    List<ApplicationStatusHistory> findByApplicationIdOrderByCreatedAtDesc(Long applicationId);

    List<ApplicationStatusHistory> findByChangedByIdOrderByCreatedAtDesc(Long userId);
}
