package com.edumind.auth.repository;

import com.edumind.auth.config.BaseRepositoryTest;
import com.edumind.auth.entity.Role;
import com.edumind.auth.entity.User;
import com.edumind.auth.enums.AuthProvider;
import com.edumind.auth.enums.RoleName;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Repository tests for UserRepository.
 * Uses Testcontainers with real PostgreSQL.
 * Default roles are available via Flyway migrations.
 */
class UserRepositoryTest extends BaseRepositoryTest {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private TestEntityManager entityManager;

    private User testUser;
    private Role studentRole;

    @BeforeEach
    void setUp() {
        // Roles are already created via Flyway migrations (V5__Insert_default_roles.sql)
        studentRole = roleRepository.findByName(RoleName.ROLE_STUDENT)
                .orElseThrow(() -> new IllegalStateException("ROLE_STUDENT not found - check Flyway migrations"));

        // Create and persist test user
        testUser = User.builder()
                .username("testuser")
                .email("test@example.com")
                .password("encodedPassword123")
                .firstName("Test")
                .lastName("User")
                .isActive(true)
                .isEmailVerified(true)
                .is2faEnabled(false)
                .provider(AuthProvider.LOCAL)
                .roles(Set.of(studentRole))
                .build();
        entityManager.persistAndFlush(testUser);

        // Clear persistence context to ensure fresh queries
        entityManager.clear();
    }

    // ==================== FIND BY USERNAME TESTS ====================

    @Nested
    @DisplayName("findByUsername Tests")
    class FindByUsernameTests {

        @Test
        @DisplayName("Should find user by username")
        void findByUsername_WhenExists_ShouldReturnUser() {
            // When
            Optional<User> result = userRepository.findByUsername("testuser");

            // Then
            assertTrue(result.isPresent());
            assertEquals("testuser", result.get().getUsername());
            assertEquals("test@example.com", result.get().getEmail());
        }

        @Test
        @DisplayName("Should return empty when username not found")
        void findByUsername_WhenNotExists_ShouldReturnEmpty() {
            // When
            Optional<User> result = userRepository.findByUsername("nonexistent");

            // Then
            assertTrue(result.isEmpty());
        }

        @Test
        @DisplayName("Should exclude deleted users")
        void findByUsername_ShouldExcludeDeletedUsers() {
            // Given - Fetch and update the user
            User fetchedUser = entityManager.find(User.class, testUser.getId());
            fetchedUser.setDeletedAt(LocalDateTime.now());
            entityManager.persistAndFlush(fetchedUser);
            entityManager.clear();

            // When
            Optional<User> result = userRepository.findByUsername("testuser");

            // Then - Should not find deleted user
            assertTrue(result.isEmpty());
        }
    }

    // ==================== FIND BY EMAIL TESTS ====================

    @Nested
    @DisplayName("findByEmail Tests")
    class FindByEmailTests {

        @Test
        @DisplayName("Should find user by email")
        void findByEmail_WhenExists_ShouldReturnUser() {
            // When
            Optional<User> result = userRepository.findByEmail("test@example.com");

            // Then
            assertTrue(result.isPresent());
            assertEquals("test@example.com", result.get().getEmail());
        }

        @Test
        @DisplayName("Should return empty when email not found")
        void findByEmail_WhenNotExists_ShouldReturnEmpty() {
            // When
            Optional<User> result = userRepository.findByEmail("nonexistent@example.com");

            // Then
            assertTrue(result.isEmpty());
        }
    }

    // ==================== FIND BY USERNAME OR EMAIL TESTS ====================

    @Nested
    @DisplayName("findByUsernameOrEmail Tests")
    class FindByUsernameOrEmailTests {

        @Test
        @DisplayName("Should find user by username")
        void findByUsernameOrEmail_WithUsername_ShouldReturnUser() {
            // When
            Optional<User> result = userRepository.findByUsernameOrEmail("testuser");

            // Then
            assertTrue(result.isPresent());
            assertEquals("testuser", result.get().getUsername());
        }

        @Test
        @DisplayName("Should find user by email")
        void findByUsernameOrEmail_WithEmail_ShouldReturnUser() {
            // When
            Optional<User> result = userRepository.findByUsernameOrEmail("test@example.com");

            // Then
            assertTrue(result.isPresent());
            assertEquals("test@example.com", result.get().getEmail());
        }
    }

    // ==================== EXISTS BY USERNAME/EMAIL TESTS ====================

    @Nested
    @DisplayName("existsByUsername Tests")
    class ExistsByUsernameTests {

        @Test
        @DisplayName("Should return true when username exists")
        void existsByUsername_WhenExists_ShouldReturnTrue() {
            // When
            Boolean result = userRepository.existsByUsername("testuser");

            // Then
            assertTrue(result);
        }

        @Test
        @DisplayName("Should return false when username not exists")
        void existsByUsername_WhenNotExists_ShouldReturnFalse() {
            // When
            Boolean result = userRepository.existsByUsername("nonexistent");

            // Then
            assertFalse(result);
        }

        @Test
        @DisplayName("Should return false for deleted user")
        void existsByUsername_ExcludesDeletedUsers() {
            // Given - Fetch and update the user
            User fetchedUser = entityManager.find(User.class, testUser.getId());
            fetchedUser.setDeletedAt(LocalDateTime.now());
            entityManager.persistAndFlush(fetchedUser);
            entityManager.clear();

            // When
            Boolean result = userRepository.existsByUsername("testuser");

            // Then
            assertFalse(result);
        }
    }

    @Nested
    @DisplayName("existsByEmail Tests")
    class ExistsByEmailTests {

        @Test
        @DisplayName("Should return true when email exists")
        void existsByEmail_WhenExists_ShouldReturnTrue() {
            // When
            Boolean result = userRepository.existsByEmail("test@example.com");

            // Then
            assertTrue(result);
        }

        @Test
        @DisplayName("Should return false when email not exists")
        void existsByEmail_WhenNotExists_ShouldReturnFalse() {
            // When
            Boolean result = userRepository.existsByEmail("nonexistent@example.com");

            // Then
            assertFalse(result);
        }
    }

    // ==================== FIND WITH ROLES TESTS ====================

    @Nested
    @DisplayName("findByUsernameWithRoles Tests")
    class FindWithRolesTests {

        @Test
        @DisplayName("Should fetch user with roles eagerly")
        void findByUsernameWithRoles_ShouldIncludeRoles() {
            // When
            Optional<User> result = userRepository.findByUsernameWithRoles("testuser");

            // Then
            assertTrue(result.isPresent());
            assertFalse(result.get().getRoles().isEmpty());
            assertTrue(result.get().getRoles().stream()
                    .anyMatch(role -> role.getName() == RoleName.ROLE_STUDENT));
        }
    }

    // ==================== FIND BY ROLES TESTS ====================

    @Nested
    @DisplayName("findByRolesContaining Tests")
    class FindByRolesContainingTests {

        @Test
        @DisplayName("Should find users by role with pagination")
        void findByRolesContaining_ShouldReturnUsersWithRole() {
            // Given - Fetch the role from DB to avoid detached entity issues
            Role dbStudentRole = roleRepository.findByName(RoleName.ROLE_STUDENT)
                    .orElseThrow();

            // When
            Page<User> result = userRepository.findByRolesContaining(
                    dbStudentRole, PageRequest.of(0, 10));

            // Then
            assertFalse(result.isEmpty());
        }

        @Test
        @DisplayName("Should find users by role as list")
        void findByRolesContaining_AsList_ShouldReturnUsers() {
            // Given - Fetch the role from DB
            Role dbStudentRole = roleRepository.findByName(RoleName.ROLE_STUDENT)
                    .orElseThrow();

            // When
            List<User> result = userRepository.findByRolesContaining(dbStudentRole);

            // Then
            assertFalse(result.isEmpty());
        }
    }

    // ==================== COUNT BY ROLES TESTS ====================

    @Nested
    @DisplayName("countByRolesName Tests")
    class CountByRolesNameTests {

        @Test
        @DisplayName("Should count users by role name")
        void countByRolesName_ShouldReturnCorrectCount() {
            // When
            Long count = userRepository.countByRolesName(RoleName.ROLE_STUDENT);

            // Then - At least 1 (our test user), may include demo users from migrations
            assertTrue(count >= 1L);
        }

        @Test
        @DisplayName("Should handle role with users from migrations")
        void countByRolesName_AdminRole_ShouldWork() {
            // When - ROLE_ADMIN may have demo users from V6__Insert_demo_users.sql
            Long count = userRepository.countByRolesName(RoleName.ROLE_ADMIN);

            // Then - Should not throw, count is valid
            assertNotNull(count);
        }
    }

    // ==================== OAUTH2 PROVIDER TESTS ====================

    @Nested
    @DisplayName("findByProviderAndProviderUserId Tests")
    class FindByProviderTests {

        @Test
        @DisplayName("Should find OAuth2 user by provider and providerId")
        void findByProviderAndProviderUserId_ShouldReturnUser() {
            // Given
            User googleUser = User.builder()
                    .username("googleuser")
                    .email("google@example.com")
                    .password(null)
                    .isActive(true)
                    .isEmailVerified(true)
                    .is2faEnabled(false)
                    .provider(AuthProvider.GOOGLE)
                    .providerUserId("google123456")
                    .build();
            entityManager.persistAndFlush(googleUser);
            entityManager.clear();

            // When
            Optional<User> result = userRepository.findByProviderAndProviderUserId(
                    AuthProvider.GOOGLE, "google123456");

            // Then
            assertTrue(result.isPresent());
            assertEquals("googleuser", result.get().getUsername());
            assertEquals(AuthProvider.GOOGLE, result.get().getProvider());
        }

        @Test
        @DisplayName("Should return empty when provider doesn't match")
        void findByProviderAndProviderUserId_WrongProvider_ShouldReturnEmpty() {
            // When - Query with wrong provider
            Optional<User> result = userRepository.findByProviderAndProviderUserId(
                    AuthProvider.GOOGLE, "localuser123");

            // Then
            assertTrue(result.isEmpty());
        }
    }

    // ==================== FIND INCLUDING DELETED TESTS ====================

    @Nested
    @DisplayName("findByIdIncludingDeleted Tests")
    class FindByIdIncludingDeletedTests {

        @Test
        @DisplayName("Should find deleted user by ID")
        void findByIdIncludingDeleted_ShouldReturnDeletedUser() {
            // Given - Fetch and update the user
            Long userId = testUser.getId();
            User fetchedUser = entityManager.find(User.class, userId);
            fetchedUser.setDeletedAt(LocalDateTime.now());
            entityManager.persistAndFlush(fetchedUser);
            entityManager.clear();

            // When
            Optional<User> result = userRepository.findByIdIncludingDeleted(userId);

            // Then
            assertTrue(result.isPresent());
            assertNotNull(result.get().getDeletedAt());
        }

        @Test
        @DisplayName("Should find active user by ID")
        void findByIdIncludingDeleted_ShouldReturnActiveUser() {
            // When
            Optional<User> result = userRepository.findByIdIncludingDeleted(testUser.getId());

            // Then
            assertTrue(result.isPresent());
            assertNull(result.get().getDeletedAt());
        }
    }
}
