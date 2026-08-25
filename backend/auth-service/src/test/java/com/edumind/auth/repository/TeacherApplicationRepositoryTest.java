package com.edumind.auth.repository;

import com.edumind.auth.config.BaseRepositoryTest;
import com.edumind.auth.entity.TeacherApplication;
import com.edumind.auth.entity.User;
import com.edumind.auth.enums.ApplicationStatus;
import com.edumind.auth.enums.AuthProvider;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;

import java.util.HashSet;

import static org.junit.jupiter.api.Assertions.*;

class TeacherApplicationRepositoryTest extends BaseRepositoryTest {

    @Autowired
    private TeacherApplicationRepository repository;

    @Autowired
    private TestEntityManager entityManager;

    @Test
    void latestApplicationQueriesExcludeHistoricalRows() {
        User user = persistUser("history");
        persistApplication(user, ApplicationStatus.REJECTED);
        persistApplication(user, ApplicationStatus.REJECTED);
        TeacherApplication approved = persistApplication(user, ApplicationStatus.APPROVED);
        entityManager.clear();

        var page = repository.findAll(PageRequest.of(0, 10));

        assertEquals(1, page.getTotalElements());
        assertEquals(approved.getId(), page.getContent().get(0).getId());
        assertEquals(0, repository.countByStatus(ApplicationStatus.REJECTED));
        assertEquals(1, repository.countByStatus(ApplicationStatus.APPROVED));
        assertEquals(approved.getId(), repository.findTopByUserOrderByIdDesc(user).orElseThrow().getId());
    }

    @Test
    void paginationCountsOneLatestApplicationPerUser() {
        for (int i = 0; i < 5; i++) {
            User user = persistUser("page" + i);
            persistApplication(user, ApplicationStatus.REJECTED);
            persistApplication(user, i % 2 == 0 ? ApplicationStatus.APPROVED : ApplicationStatus.PENDING);
        }
        entityManager.clear();

        var first = repository.findAll(PageRequest.of(0, 2, Sort.by("id")));
        var second = repository.findAll(PageRequest.of(1, 2, Sort.by("id")));
        var third = repository.findAll(PageRequest.of(2, 2, Sort.by("id")));

        assertEquals(5, first.getTotalElements());
        assertEquals(3, first.getTotalPages());
        assertEquals(2, first.getNumberOfElements());
        assertEquals(2, second.getNumberOfElements());
        assertEquals(1, third.getNumberOfElements());
        assertTrue(first.getContent().stream().noneMatch(a -> a.getStatus() == ApplicationStatus.REJECTED));
    }

    @Test
    void partialUniqueIndexRejectsSecondPendingApplication() {
        User user = persistUser("pending");
        persistApplication(user, ApplicationStatus.PENDING);

        assertThrows(DataIntegrityViolationException.class,
                () -> repository.saveAndFlush(newApplication(user, ApplicationStatus.PENDING)));
    }

    private User persistUser(String suffix) {
        User user = User.builder()
                .username("teacher-" + suffix)
                .email("teacher-" + suffix + "@example.com")
                .password("encoded-password")
                .firstName("Teacher")
                .lastName(suffix)
                .isActive(true)
                .isEmailVerified(true)
                .is2faEnabled(false)
                .provider(AuthProvider.LOCAL)
                .roles(new HashSet<>())
                .build();
        entityManager.persistAndFlush(user);
        return user;
    }

    private TeacherApplication persistApplication(User user, ApplicationStatus status) {
        TeacherApplication application = newApplication(user, status);
        entityManager.persistAndFlush(application);
        return application;
    }

    private TeacherApplication newApplication(User user, ApplicationStatus status) {
        return TeacherApplication.builder()
                .user(user)
                .firstName("Teacher")
                .lastName(user.getLastName())
                .email(user.getEmail())
                .subject("Mathematics")
                .experienceYears(3)
                .documents("[]")
                .status(status)
                .build();
    }
}
