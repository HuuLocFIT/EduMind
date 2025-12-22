package com.edumind.auth.service;

import com.edumind.auth.dto.request.CreateUserRequest;
import com.edumind.auth.dto.request.UpdateUserRoleRequest;
import com.edumind.auth.dto.response.UserListResponse;
import com.edumind.auth.entity.Role;
import com.edumind.auth.entity.User;
import com.edumind.auth.enums.RoleName;
import com.edumind.auth.repository.RoleRepository;
import com.edumind.auth.repository.UserRepository;
import com.edumind.common.exception.BadRequestException;
import com.edumind.common.exception.ResourceNotFoundException;
import com.edumind.common.response.MessageResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AdminServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private RoleRepository roleRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @InjectMocks
    private AdminService adminService;

    private User testUser;
    private Role studentRole;
    private Role teacherRole;
    private Role adminRole;

    @BeforeEach
    void setUp() {
        studentRole = Role.builder().id(1L).name(RoleName.ROLE_STUDENT).build();
        teacherRole = Role.builder().id(2L).name(RoleName.ROLE_TEACHER).build();
        adminRole = Role.builder().id(3L).name(RoleName.ROLE_ADMIN).build();

        testUser = User.builder()
                .id(1L)
                .username("testuser")
                .email("test@example.com")
                .isActive(true)
                .roles(new java.util.HashSet<>(Set.of(studentRole)))
                .build();
    }

    @Nested
    @DisplayName("createTeacher Tests")
    class CreateTeacherTests {

        @Test
        @DisplayName("Should create teacher successfully")
        void createTeacher_Success() {
            // Given
            CreateUserRequest request = new CreateUserRequest();
            request.setUsername("teacher");
            request.setEmail("teacher@example.com");
            request.setPassword("password");
            request.setRoles(Set.of("ROLE_TEACHER"));

            when(userRepository.existsByUsername(request.getUsername())).thenReturn(false);
            when(userRepository.existsByEmail(request.getEmail())).thenReturn(false);
            when(roleRepository.findByName(RoleName.ROLE_TEACHER)).thenReturn(Optional.of(teacherRole));
            when(passwordEncoder.encode(request.getPassword())).thenReturn("encodedPass");
            when(userRepository.save(any(User.class))).thenAnswer(invocation -> {
                User u = invocation.getArgument(0);
                u.setId(10L);
                return u;
            });

            // When
            MessageResponse response = adminService.createTeacher(request);

            // Then
            assertEquals(HttpStatus.CREATED.value(), response.getStatus());
            assertTrue(response.isSuccess());
            verify(userRepository).save(any(User.class));
        }

        @Test
        @DisplayName("Should fail if ROLE_TEACHER is missing")
        void createTeacher_Fail_MissingRole() {
            // Given
            CreateUserRequest request = new CreateUserRequest();
            request.setUsername("teacher");
            request.setRoles(Set.of("ROLE_STUDENT")); // Wrong role

            // When/Then
            BadRequestException ex = assertThrows(BadRequestException.class, () -> 
                adminService.createTeacher(request));
            assertEquals("Invalid role! Use createAdmin() for ADMIN accounts.", ex.getMessage());
        }
    }

    @Nested
    @DisplayName("createAdmin Tests")
    class CreateAdminTests {

        @Test
        @DisplayName("Should create admin successfully")
        void createAdmin_Success() {
            // Given
            CreateUserRequest request = new CreateUserRequest();
            request.setUsername("admin");
            request.setEmail("admin@example.com");
            request.setPassword("password");
            request.setRoles(Set.of("ROLE_ADMIN"));

            when(userRepository.existsByUsername(request.getUsername())).thenReturn(false);
            when(userRepository.existsByEmail(request.getEmail())).thenReturn(false);
            when(roleRepository.findByName(RoleName.ROLE_ADMIN)).thenReturn(Optional.of(adminRole));
            when(passwordEncoder.encode(request.getPassword())).thenReturn("encodedPass");
            when(userRepository.save(any(User.class))).thenAnswer(invocation -> {
                User u = invocation.getArgument(0);
                u.setId(11L);
                return u;
            });

            // When
            MessageResponse response = adminService.createAdmin(request);

            // Then
            assertEquals(HttpStatus.CREATED.value(), response.getStatus());
            assertTrue(response.isSuccess());
            verify(userRepository).save(any(User.class));
        }

        @Test
        @DisplayName("Should fail if email exists")
        void createAdmin_Fail_EmailExists() {
            // Given
            CreateUserRequest request = new CreateUserRequest();
            request.setUsername("admin");
            request.setEmail("exists@example.com");
            request.setRoles(Set.of("ROLE_ADMIN"));

            when(userRepository.existsByUsername(request.getUsername())).thenReturn(false);
            when(userRepository.existsByEmail(request.getEmail())).thenReturn(true);

            // When/Then
            BadRequestException ex = assertThrows(BadRequestException.class, () -> 
                adminService.createAdmin(request));
            assertEquals("Email is already in use!", ex.getMessage());
        }
    }

    @Nested
    @DisplayName("updateUserRoles Tests")
    class UpdateUserRolesTests {

        @Test
        @DisplayName("Should update user roles successfully")
        void updateUserRoles_Success() {
            // Given
            UpdateUserRoleRequest request = new UpdateUserRoleRequest();
            request.setRoles(Set.of("ROLE_TEAHER", "ROLE_ADMIN")); // Typo intended to check parsing? No, let's use valid
            request.setRoles(Set.of("ROLE_TEACHER", "ROLE_ADMIN"));

            when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));
            when(roleRepository.findByName(RoleName.ROLE_TEACHER)).thenReturn(Optional.of(teacherRole));
            when(roleRepository.findByName(RoleName.ROLE_ADMIN)).thenReturn(Optional.of(adminRole));
            when(userRepository.save(any(User.class))).thenReturn(testUser);

            // When
            MessageResponse response = adminService.updateUserRoles(1L, request);

            // Then
            assertEquals(HttpStatus.OK.value(), response.getStatus());
            assertTrue(response.isSuccess());
            assertTrue(testUser.getRoles().contains(teacherRole));
            assertTrue(testUser.getRoles().contains(adminRole));
        }

        @Test
        @DisplayName("Should fail if user not found")
        void updateUserRoles_Fail_UserNotFound() {
            // Given
            UpdateUserRoleRequest request = new UpdateUserRoleRequest();
            request.setRoles(Set.of("ROLE_TEACHER"));

            when(userRepository.findById(99L)).thenReturn(Optional.empty());

            // When/Then
            assertThrows(ResourceNotFoundException.class, () -> 
                adminService.updateUserRoles(99L, request));
        }
    }

    @Nested
    @DisplayName("toggleUserStatus Tests")
    class ToggleUserStatusTests {

        @Test
        @DisplayName("Should disable user")
        void toggleUserStatus_Disable() {
            // Given
            when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));
            when(userRepository.save(any(User.class))).thenReturn(testUser);

            // When
            MessageResponse response = adminService.toggleUserStatus(1L, false);

            // Then
            assertEquals(HttpStatus.OK.value(), response.getStatus());
            assertFalse(testUser.getIsActive());
        }
    }

    @Nested
    @DisplayName("deleteUser Tests")
    class DeleteUserTests {

        @Test
        @DisplayName("Should delete (disable) user successfully")
        void deleteUser_Success() {
            // Given
            User userToDelete = User.builder()
                    .id(2L)
                    .username("userToDelete")
                    .roles(Set.of(studentRole))
                    .isActive(true)
                    .build();

            when(userRepository.findById(2L)).thenReturn(Optional.of(userToDelete));
            when(userRepository.save(any(User.class))).thenReturn(userToDelete);

            // When
            MessageResponse response = adminService.deleteUser(2L);

            // Then
            assertEquals(HttpStatus.OK.value(), response.getStatus());
            assertFalse(userToDelete.getIsActive());
        }

        @Test
        @DisplayName("Should prevent deleting the last admin")
        void deleteUser_Fail_LastAdmin() {
            // Given
            User lastAdmin = User.builder()
                    .id(1L)
                    .username("admin")
                    .roles(Set.of(adminRole))
                    .isActive(true)
                    .build();

            when(userRepository.findById(1L)).thenReturn(Optional.of(lastAdmin));
            when(userRepository.countByRolesName(RoleName.ROLE_ADMIN)).thenReturn(1L);

            // When/Then
            BadRequestException ex = assertThrows(BadRequestException.class, () -> 
                adminService.deleteUser(1L));
            assertEquals("Cannot delete the last admin account!", ex.getMessage());
        }
    }

    @Nested
    @DisplayName("getAllUsers Tests")
    class GetAllUsersTests {

        @Test
        @DisplayName("Should return page of users")
        void getAllUsers_Success() {
            // Given
            PageImpl<User> userPage = new PageImpl<>(List.of(testUser));
            when(userRepository.findAll(any(Pageable.class))).thenReturn(userPage);

            // When
            Page<UserListResponse> result = adminService.getAllUsers(0, 10, "username");

            // Then
            assertNotNull(result);
            assertEquals(1, result.getTotalElements());
            assertEquals("testuser", result.getContent().get(0).getUsername());
        }
    }

    @Nested
    @DisplayName("getUsersByRole Tests")
    class GetUsersByRoleTests {

        @Test
        @DisplayName("Should return page of users with specific role")
        void getUsersByRole_Success() {
            // Given
            PageImpl<User> userPage = new PageImpl<>(List.of(testUser));
            when(roleRepository.findByName(RoleName.ROLE_STUDENT)).thenReturn(Optional.of(studentRole));
            when(userRepository.findByRolesContaining(eq(studentRole), any(Pageable.class))).thenReturn(userPage);

            // When
            Page<UserListResponse> result = adminService.getUsersByRole("ROLE_STUDENT", 0, 10);

            // Then
            assertNotNull(result);
            assertEquals(1, result.getTotalElements());
        }

        @Test
        @DisplayName("Should fail when role not found")
        void getUsersByRole_Fail_RoleNotFound() {
            // Given
            when(roleRepository.findByName(any())).thenReturn(Optional.empty());

            // When/Then
            assertThrows(ResourceNotFoundException.class, () -> 
                adminService.getUsersByRole("ROLE_STUDENT", 0, 10));
        }
    }
}
