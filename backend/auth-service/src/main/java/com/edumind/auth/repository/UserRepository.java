package com.edumind.auth.repository;

import com.edumind.auth.entity.Role;
import com.edumind.auth.enums.AuthProvider;
import com.edumind.auth.enums.RoleName;
import com.edumind.auth.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    // Find methods - exclude deleted users
    @Query("SELECT u FROM User u WHERE u.username = :username AND u.deletedAt IS NULL")
    Optional<User> findByUsername(String username);

    @Query("SELECT u FROM User u WHERE u.email = :email AND u.deletedAt IS NULL")
    Optional<User> findByEmail(String email);

    @Query("SELECT u FROM User u WHERE (u.username = :usernameOrEmail OR u.email = :usernameOrEmail) AND u.deletedAt IS NULL")
    Optional<User> findByUsernameOrEmail(@Param("usernameOrEmail") String usernameOrEmail);

    @Query("SELECT COUNT(u) > 0 FROM User u WHERE u.username = :username AND u.deletedAt IS NULL")
    Boolean existsByUsername(String username);

    @Query("SELECT COUNT(u) > 0 FROM User u WHERE u.email = :email AND u.deletedAt IS NULL")
    Boolean existsByEmail(String email);

    @Query("SELECT u FROM User u LEFT JOIN FETCH u.roles WHERE u.username = :username AND u.deletedAt IS NULL")
    Optional<User> findByUsernameWithRoles(String username);

    @Query("SELECT u FROM User u LEFT JOIN FETCH u.roles WHERE u.email = :email AND u.deletedAt IS NULL")
    Optional<User> findByEmailWithRoles(String email);

    Page<User> findByRolesContaining(Role role, Pageable pageable);

    Page<User> findByRolesContainingAndIsActive(Role role, Boolean isActive, Pageable pageable);

    List<User> findByRolesContaining(Role role);

    @Query("SELECT COUNT(u) FROM User u JOIN u.roles r WHERE r.name = :roleName AND u.deletedAt IS NULL")
    Long countByRolesName(@Param("roleName") RoleName roleName);

    @Query("SELECT COUNT(u) FROM User u JOIN u.roles r WHERE r.name = :roleName AND u.isActive = :isActive AND u.deletedAt IS NULL")
    long countByRolesNameAndIsActive(@Param("roleName") RoleName roleName, @Param("isActive") boolean isActive);

    @Query("SELECT u FROM User u WHERE u.provider = :provider AND u.providerUserId = :providerUserId AND u.deletedAt IS NULL")
    Optional<User> findByProviderAndProviderUserId(@Param("provider") AuthProvider provider, @Param("providerUserId") String providerUserId);
    
    @Query("SELECT COUNT(u) FROM User u JOIN u.roles r WHERE r.name = :roleName AND u.trialEndDate BETWEEN :now AND :cutoff AND u.deletedAt IS NULL")
    long countExpiringTrialTeachers(@Param("roleName") RoleName roleName, @Param("now") java.time.LocalDateTime now, @Param("cutoff") java.time.LocalDateTime cutoff);

    @Query("SELECT COUNT(u) FROM User u JOIN u.roles r WHERE r.name = :roleName AND u.trialEndDate > :now AND u.deletedAt IS NULL")
    long countActiveTrialTeachers(@Param("roleName") RoleName roleName, @Param("now") java.time.LocalDateTime now);

    @Query("SELECT COUNT(u) FROM User u JOIN u.roles r WHERE r.name = :roleName AND u.trialEndDate IS NOT NULL AND u.trialEndDate <= :now AND u.deletedAt IS NULL")
    long countExpiredTrialTeachers(@Param("roleName") RoleName roleName, @Param("now") java.time.LocalDateTime now);

    @Query("SELECT u FROM User u JOIN u.roles r WHERE r = :role AND u.deletedAt IS NULL " +
           "AND (LOWER(u.username) LIKE LOWER(CONCAT('%', :search, '%')) " +
           "OR LOWER(u.email) LIKE LOWER(CONCAT('%', :search, '%')) " +
           "OR LOWER(u.firstName) LIKE LOWER(CONCAT('%', :search, '%')) " +
           "OR LOWER(u.lastName) LIKE LOWER(CONCAT('%', :search, '%')))")
    Page<User> findByRolesContainingAndSearch(@Param("role") Role role, @Param("search") String search, Pageable pageable);

    @Query("SELECT u FROM User u JOIN u.roles r WHERE r = :role AND u.isActive = :isActive AND u.deletedAt IS NULL " +
           "AND (LOWER(u.username) LIKE LOWER(CONCAT('%', :search, '%')) " +
           "OR LOWER(u.email) LIKE LOWER(CONCAT('%', :search, '%')) " +
           "OR LOWER(u.firstName) LIKE LOWER(CONCAT('%', :search, '%')) " +
           "OR LOWER(u.lastName) LIKE LOWER(CONCAT('%', :search, '%')))")
    Page<User> findByRolesContainingAndIsActiveAndSearch(@Param("role") Role role, @Param("isActive") Boolean isActive, @Param("search") String search, Pageable pageable);

    @Query("SELECT u FROM User u JOIN u.roles r WHERE r = :role AND u.deletedAt IS NULL " +
           "AND u.trialEndDate BETWEEN :from AND :to")
    Page<User> findExpiringTrialTeachers(@Param("role") Role role, @Param("from") java.time.LocalDateTime from, @Param("to") java.time.LocalDateTime to, Pageable pageable);

    @Query("SELECT u FROM User u JOIN u.roles r WHERE r = :role AND u.deletedAt IS NULL " +
           "AND u.trialEndDate BETWEEN :from AND :to " +
           "AND (LOWER(u.username) LIKE LOWER(CONCAT('%', :search, '%')) " +
           "OR LOWER(u.firstName) LIKE LOWER(CONCAT('%', :search, '%')) " +
           "OR LOWER(u.lastName) LIKE LOWER(CONCAT('%', :search, '%')))")
    Page<User> findExpiringTrialTeachersWithSearch(@Param("role") Role role, @Param("search") String search, @Param("from") java.time.LocalDateTime from, @Param("to") java.time.LocalDateTime to, Pageable pageable);

    // Admin methods - include deleted users if needed
    @Query("SELECT u FROM User u WHERE u.id = :id")
    Optional<User> findByIdIncludingDeleted(@Param("id") Long id);
}
