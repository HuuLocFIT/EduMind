package com.edumind.auth.repository;

import com.edumind.auth.entity.Role;
import com.edumind.auth.enums.RoleName;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.test.context.ActiveProfiles;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Repository tests for RoleRepository
 * Uses @DataJpaTest with H2 in-memory database
 */
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.ANY)
@ActiveProfiles("test")
class RoleRepositoryTest {

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private TestEntityManager entityManager;

    private Role studentRole;
    private Role teacherRole;
    private Role adminRole;

    @BeforeEach
    void setUp() {
        // Create and persist roles
        studentRole = Role.builder()
                .name(RoleName.ROLE_STUDENT)
                .description("Student role")
                .build();
        entityManager.persistAndFlush(studentRole);

        teacherRole = Role.builder()
                .name(RoleName.ROLE_TEACHER)
                .description("Teacher role")
                .build();
        entityManager.persistAndFlush(teacherRole);

        adminRole = Role.builder()
                .name(RoleName.ROLE_ADMIN)
                .description("Admin role")
                .build();
        entityManager.persistAndFlush(adminRole);

        entityManager.clear();
    }

    // ==================== FIND BY NAME TESTS ====================

    @Nested
    @DisplayName("findByName Tests")
    class FindByNameTests {

        @Test
        @DisplayName("Should find role by name - ROLE_STUDENT")
        void findByName_RoleStudent_ShouldReturnRole() {
            // When
            Optional<Role> result = roleRepository.findByName(RoleName.ROLE_STUDENT);

            // Then
            assertTrue(result.isPresent());
            assertEquals(RoleName.ROLE_STUDENT, result.get().getName());
            assertEquals("Student role", result.get().getDescription());
        }

        @Test
        @DisplayName("Should find role by name - ROLE_TEACHER")
        void findByName_RoleTeacher_ShouldReturnRole() {
            // When
            Optional<Role> result = roleRepository.findByName(RoleName.ROLE_TEACHER);

            // Then
            assertTrue(result.isPresent());
            assertEquals(RoleName.ROLE_TEACHER, result.get().getName());
            assertEquals("Teacher role", result.get().getDescription());
        }

        @Test
        @DisplayName("Should find role by name - ROLE_ADMIN")
        void findByName_RoleAdmin_ShouldReturnRole() {
            // When
            Optional<Role> result = roleRepository.findByName(RoleName.ROLE_ADMIN);

            // Then
            assertTrue(result.isPresent());
            assertEquals(RoleName.ROLE_ADMIN, result.get().getName());
            assertEquals("Admin role", result.get().getDescription());
        }

        @Test
        @DisplayName("Should return empty when role not found")
        void findByName_NonExistentRole_ShouldReturnEmpty() {
            // Given - Delete a role first
            Role fetchedAdmin = entityManager.find(Role.class, adminRole.getId());
            entityManager.remove(fetchedAdmin);
            entityManager.flush();
            entityManager.clear();

            // Save student and teacher again
            // (in real scenario, specific role might not exist in fresh DB)

            // When - looking for a role that doesn't exist after setup cleanup
            // We need to manually remove all and check
            roleRepository.deleteAll();
            entityManager.flush();
            entityManager.clear();

            Optional<Role> result = roleRepository.findByName(RoleName.ROLE_STUDENT);

            // Then
            assertTrue(result.isEmpty());
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
        @DisplayName("Should return false when role does not exist")
        void existsByName_NonExistentRole_ShouldReturnFalse() {
            // Given - Clear all roles
            roleRepository.deleteAll();
            entityManager.flush();
            entityManager.clear();

            // When
            Boolean exists = roleRepository.existsByName(RoleName.ROLE_STUDENT);

            // Then
            assertFalse(exists);
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
        @DisplayName("Should count all roles")
        void count_ShouldReturnTotalRoles() {
            // When
            long count = roleRepository.count();

            // Then
            assertEquals(3, count); // student, teacher, admin
        }

        @Test
        @DisplayName("Should find role by id")
        void findById_ShouldReturnRole() {
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
            assertEquals(3, roles.size());
        }

        @Test
        @DisplayName("Should save new role")
        void save_NewRole_ShouldPersist() {
            // Given - Clear and create new role
            roleRepository.deleteAll();
            entityManager.flush();
            entityManager.clear();

            Role newRole = Role.builder()
                    .name(RoleName.ROLE_STUDENT)
                    .description("New student role")
                    .build();

            // When
            Role saved = roleRepository.save(newRole);
            entityManager.flush();
            entityManager.clear();

            // Then
            assertNotNull(saved.getId());
            Optional<Role> found = roleRepository.findById(saved.getId());
            assertTrue(found.isPresent());
            assertEquals("New student role", found.get().getDescription());
        }

        @Test
        @DisplayName("Should delete role")
        void delete_ShouldRemoveRole() {
            // Given
            Long adminId = adminRole.getId();

            // When
            roleRepository.deleteById(adminId);
            entityManager.flush();
            entityManager.clear();

            // Then
            Optional<Role> result = roleRepository.findById(adminId);
            assertTrue(result.isEmpty());
            assertEquals(2, roleRepository.count());
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
        @DisplayName("Should update existing role")
        void save_ExistingRole_ShouldUpdate() {
            // Given
            Role fetchedRole = entityManager.find(Role.class, studentRole.getId());
            fetchedRole.setDescription("Updated student role description");
            entityManager.clear();

            // When
            Role updated = roleRepository.save(fetchedRole);
            entityManager.flush();
            entityManager.clear();

            // Then
            Optional<Role> found = roleRepository.findById(updated.getId());
            assertTrue(found.isPresent());
            assertEquals("Updated student role description", found.get().getDescription());
        }
    }
}
