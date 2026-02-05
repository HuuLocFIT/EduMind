package com.edumind.auth.repository;

import com.edumind.auth.config.BaseRepositoryTest;
import com.edumind.auth.entity.Role;
import com.edumind.auth.enums.RoleName;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Repository tests for RoleRepository.
 * Uses Testcontainers with real PostgreSQL.
 * Default roles are pre-populated via Flyway migration V5__Insert_default_roles.sql
 */
class RoleRepositoryTest extends BaseRepositoryTest {

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private TestEntityManager entityManager;

    // ==================== FIND BY NAME TESTS ====================

    @Nested
    @DisplayName("findByName Tests")
    class FindByNameTests {

        @Test
        @DisplayName("Should find role by name - ROLE_STUDENT")
        void findByName_RoleStudent_ShouldReturnRole() {
            // When - Roles are pre-populated by Flyway
            Optional<Role> result = roleRepository.findByName(RoleName.ROLE_STUDENT);

            // Then
            assertTrue(result.isPresent());
            assertEquals(RoleName.ROLE_STUDENT, result.get().getName());
        }

        @Test
        @DisplayName("Should find role by name - ROLE_TEACHER")
        void findByName_RoleTeacher_ShouldReturnRole() {
            // When
            Optional<Role> result = roleRepository.findByName(RoleName.ROLE_TEACHER);

            // Then
            assertTrue(result.isPresent());
            assertEquals(RoleName.ROLE_TEACHER, result.get().getName());
        }

        @Test
        @DisplayName("Should find role by name - ROLE_ADMIN")
        void findByName_RoleAdmin_ShouldReturnRole() {
            // When
            Optional<Role> result = roleRepository.findByName(RoleName.ROLE_ADMIN);

            // Then
            assertTrue(result.isPresent());
            assertEquals(RoleName.ROLE_ADMIN, result.get().getName());
        }

        @Test
        @DisplayName("Should handle null name gracefully")
        void findByName_WithNullName_ShouldReturnEmpty() {
            // When
            Optional<Role> result = roleRepository.findByName(null);

            // Then
            assertTrue(result.isEmpty());
        }
    }

    // ==================== EXISTS BY NAME TESTS ====================

    @Nested
    @DisplayName("existsByName Tests")
    class ExistsByNameTests {

        @Test
        @DisplayName("Should return true when ROLE_STUDENT exists")
        void existsByName_RoleStudent_ShouldReturnTrue() {
            // When
            Boolean exists = roleRepository.existsByName(RoleName.ROLE_STUDENT);

            // Then
            assertTrue(exists);
        }

        @Test
        @DisplayName("Should return true when ROLE_TEACHER exists")
        void existsByName_RoleTeacher_ShouldReturnTrue() {
            // When
            Boolean exists = roleRepository.existsByName(RoleName.ROLE_TEACHER);

            // Then
            assertTrue(exists);
        }

        @Test
        @DisplayName("Should return true when ROLE_ADMIN exists")
        void existsByName_RoleAdmin_ShouldReturnTrue() {
            // When
            Boolean exists = roleRepository.existsByName(RoleName.ROLE_ADMIN);

            // Then
            assertTrue(exists);
        }

        @Test
        @DisplayName("Should return false when name is null")
        void existsByName_WithNullName_ShouldReturnFalse() {
            // When
            Boolean exists = roleRepository.existsByName(null);

            // Then
            assertFalse(exists);
        }
    }

    // ==================== BASIC CRUD TESTS ====================

    @Nested
    @DisplayName("Basic CRUD Tests")
    class BasicCrudTests {

        @Test
        @DisplayName("Should have at least 3 default roles")
        void count_ShouldReturnAtLeastDefaultRoles() {
            // When
            long count = roleRepository.count();

            // Then - Should have at least STUDENT, TEACHER, ADMIN (may have more from migrations)
            assertTrue(count >= 3);
        }

        @Test
        @DisplayName("Should find role by id")
        void findById_ShouldReturnRole() {
            // Given - Get a role from Flyway migrations
            Role studentRole = roleRepository.findByName(RoleName.ROLE_STUDENT).orElseThrow();

            // When
            Optional<Role> result = roleRepository.findById(studentRole.getId());

            // Then
            assertTrue(result.isPresent());
            assertEquals(RoleName.ROLE_STUDENT, result.get().getName());
        }

        @Test
        @DisplayName("Should return all roles")
        void findAll_ShouldReturnAllRoles() {
            // When
            var roles = roleRepository.findAll();

            // Then
            assertTrue(roles.size() >= 3);
        }

        @Test
        @DisplayName("Should return empty when finding non-existent id")
        void findById_NonExistentId_ShouldReturnEmpty() {
            // When
            Optional<Role> result = roleRepository.findById(99999L);

            // Then
            assertTrue(result.isEmpty());
        }

        @Test
        @DisplayName("Should update existing role description")
        void save_ExistingRole_ShouldUpdate() {
            // Given
            Role studentRole = roleRepository.findByName(RoleName.ROLE_STUDENT).orElseThrow();
            String originalDescription = studentRole.getDescription();
            Long roleId = studentRole.getId();

            studentRole.setDescription("Updated student role description");

            // When
            Role updated = roleRepository.save(studentRole);
            entityManager.flush();
            entityManager.clear();

            // Then
            Optional<Role> found = roleRepository.findById(roleId);
            assertTrue(found.isPresent());
            assertEquals("Updated student role description", found.get().getDescription());

            // Cleanup - restore original description
            found.get().setDescription(originalDescription);
            roleRepository.save(found.get());
            entityManager.flush();
        }
    }
}
