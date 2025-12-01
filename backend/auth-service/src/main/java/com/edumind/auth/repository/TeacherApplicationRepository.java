package com.edumind.auth.repository;

import com.edumind.auth.entity.TeacherApplication;
import com.edumind.auth.entity.User;
import com.edumind.auth.enums.ApplicationStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TeacherApplicationRepository extends JpaRepository<TeacherApplication, Long> {
    Optional<TeacherApplication> findByUser(User user);

    Optional<TeacherApplication> findByUserId(Long userId);

    Page<TeacherApplication> findByStatus(ApplicationStatus status, Pageable pageable);

    List<TeacherApplication> findByStatusOrderByCreatedAtDesc(ApplicationStatus status);

    Boolean existsByUser(User user);

    Boolean existsByUserId(Long userId);
}