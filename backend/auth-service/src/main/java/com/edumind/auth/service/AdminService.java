package com.edumind.auth.service;

import com.edumind.auth.dto.request.CreateUserRequest;
import com.edumind.auth.dto.request.UpdateUserRoleRequest;
import com.edumind.auth.dto.response.UserListResponse;
import com.edumind.auth.entity.Role;
import com.edumind.auth.enums.RoleName;
import com.edumind.auth.entity.User;
import com.edumind.auth.repository.RoleRepository;
import com.edumind.auth.repository.UserRepository;
import com.edumind.common.exception.BadRequestException;
import com.edumind.common.exception.ResourceNotFoundException;
import com.edumind.common.response.MessageResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Set;
import java.util.stream.Collectors;

import com.edumind.common.constants.ResponseStatus;

@Service
public class AdminService {

    private static final Logger logger = LoggerFactory.getLogger(AdminService.class);

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    /**
     * Admin creates TEACHER account
     */
    @Transactional
    public MessageResponse createTeacher(CreateUserRequest request) {
        logger.info("🔄 Admin creating TEACHER account: {}", request.getUsername());

        if (!request.getRoles().contains("ROLE_TEACHER")) {
            throw new BadRequestException("Invalid role! Use createAdmin() for ADMIN accounts.");
        }

        return createUserWithRoles(request, Set.of("ROLE_TEACHER"));
    }

    /**
     * Admin creates ADMIN account
     */
    @Transactional
    public MessageResponse createAdmin(CreateUserRequest request) {
        logger.info("🔄 Admin creating ADMIN account: {}", request.getUsername());

        if (!request.getRoles().contains("ROLE_ADMIN")) {
            throw new BadRequestException("Invalid role! Use createTeacher() for TEACHER accounts.");
        }

        return createUserWithRoles(request, Set.of("ROLE_ADMIN"));
    }

    /**
     * Private helper method to create user with specific roles
     */
    private MessageResponse createUserWithRoles(CreateUserRequest request, Set<String> allowedRoles) {
        // Check username exists
        if (userRepository.existsByUsername(request.getUsername())) {
            logger.warn("❌ Username already exists: {}", request.getUsername());
            throw new BadRequestException("Username is already taken!");
        }

        // Check email exists
        if (userRepository.existsByEmail(request.getEmail())) {
            logger.warn("❌ Email already exists: {}", request.getEmail());
            throw new BadRequestException("Email is already in use!");
        }

        // Validate roles
        Set<String> rolesToAssign = request.getRoles().stream()
                .filter(allowedRoles::contains)
                .collect(Collectors.toSet());

        if (rolesToAssign.isEmpty()) {
            throw new BadRequestException("Invalid roles provided!");
        }

        // Create new user
        User user = User.builder()
                .username(request.getUsername())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .firstName(request.getFirstName())
                .lastName(request.getLastName())
                .phoneNumber(request.getPhoneNumber())
                .isActive(true)
                .isEmailVerified(true)  // Admin-created accounts are verified
                .build();

        // Assign roles
        Set<Role> roles = rolesToAssign.stream()
                .map(roleName -> roleRepository.findByName(RoleName.valueOf(roleName))
                        .orElseThrow(() -> new ResourceNotFoundException("Role not found: " + roleName)))
                .collect(Collectors.toSet());

        user.setRoles(roles);

        User savedUser = userRepository.save(user);
        logger.info("✅ User created successfully: {} with roles: {}",
                savedUser.getUsername(), rolesToAssign);

        return MessageResponse.builder()
                .status(HttpStatus.CREATED.value())
                .success(true)
                .message("User created successfully with roles: " + rolesToAssign)
                .build();
    }

    /**
     * Get all users with pagination
     */
    public Page<UserListResponse> getAllUsers(int page, int size, String sortBy) {
        logger.info("🔄 Admin fetching all users - page: {}, size: {}", page, size);

        Pageable pageable = PageRequest.of(page, size, Sort.by(sortBy).descending());
        Page<User> usersPage = userRepository.findAll(pageable);

        return usersPage.map(user -> UserListResponse.builder()
                .id(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .roles(user.getRoles().stream()
                        .map(role -> role.getName().name())
                        .collect(Collectors.toList()))
                .createdAt(user.getCreatedAt())
                .updatedAt(user.getUpdatedAt())
                .isActive(user.getIsActive())
                .build());
    }

    /**
     * Get users by role
     */
    public Page<UserListResponse> getUsersByRole(String roleName, int page, int size, Boolean isActive) {
        logger.info("🔄 Admin fetching users with role: {}, isActive: {}", roleName, isActive);

        Role role = roleRepository.findByName(RoleName.valueOf(roleName))
                .orElseThrow(() -> new ResourceNotFoundException("Role not found: " + roleName));

        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        
        Page<User> usersPage;
        if (isActive != null) {
            usersPage = userRepository.findByRolesContainingAndIsActive(role, isActive, pageable);
        } else {
            usersPage = userRepository.findByRolesContaining(role, pageable);
        }

        return usersPage.map(user -> UserListResponse.builder()
                .id(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .roles(user.getRoles().stream()
                        .map(role2 -> role2.getName().name())
                        .collect(Collectors.toList()))
                .createdAt(user.getCreatedAt())
                .updatedAt(user.getUpdatedAt())
                .isActive(user.getIsActive())
                .build());
    }

    /**
     * Update user roles
     */
    @Transactional
    public MessageResponse updateUserRoles(Long userId, UpdateUserRoleRequest request) {
        logger.info("🔄 Admin updating roles for user ID: {}", userId);

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + userId));

        // Get new roles
        Set<Role> newRoles = request.getRoles().stream()
                .map(roleName -> roleRepository.findByName(RoleName.valueOf(roleName))
                        .orElseThrow(() -> new ResourceNotFoundException("Role not found: " + roleName)))
                .collect(Collectors.toSet());

        user.setRoles(newRoles);
        userRepository.save(user);

        logger.info("✅ User roles updated successfully for: {}", user.getUsername());

        return MessageResponse.builder()
                .status(HttpStatus.OK.value())
                .success(true)
                .message("User roles updated successfully")
                .build();
    }

    /**
     * Enable/Disable user account
     */
    @Transactional
    public MessageResponse toggleUserStatus(Long userId, boolean enabled) {
        logger.info("🔄 Admin {} user ID: {}", enabled ? "enabling" : "disabling", userId);

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + userId));

        user.setIsActive(enabled);
        userRepository.save(user);

        logger.info("✅ User status updated: {} is now {}",
                user.getUsername(), enabled ? "enabled" : "disabled");

        return MessageResponse.builder()
                .status(HttpStatus.OK.value())
                .success(true)
                .message("User " + (enabled ? "enabled" : "disabled") + " successfully")
                .build();
    }

    /**
     * Delete user (soft delete by disabling)
     */
    @Transactional
    public MessageResponse deleteUser(Long userId) {
        logger.info("🔄 Admin deleting user ID: {}", userId);

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + userId));

        // Prevent deleting the last admin
        if (user.getRoles().stream()
                .anyMatch(role -> role.getName() == RoleName.ROLE_ADMIN)) {
            long adminCount = userRepository.countByRolesName(RoleName.ROLE_ADMIN);
            if (adminCount <= 1) {
                throw new BadRequestException("Cannot delete the last admin account!");
            }
        }

        user.setIsActive(false);
        userRepository.save(user);

        logger.info("✅ User deleted (disabled): {}", user.getUsername());

        return MessageResponse.builder()
                .status(HttpStatus.OK.value())
                .success(true)
                .message(ResponseStatus.DELETED)
                .build();
    }
}