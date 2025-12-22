package com.edumind.auth.controller;

import com.edumind.auth.config.TestSecurityConfig;
import com.edumind.auth.dto.request.CreateUserRequest;
import com.edumind.auth.dto.request.ReviewApplicationRequest;
import com.edumind.auth.dto.request.UpdateUserRoleRequest;
import com.edumind.auth.dto.request.UpgradeTrialRequest;
import com.edumind.auth.dto.response.TeacherApplicationResponse;
import com.edumind.auth.dto.response.TrialStatusResponse;
import com.edumind.auth.dto.response.UserListResponse;
import com.edumind.auth.service.AdminService;
import com.edumind.auth.service.TeacherApplicationService;
import com.edumind.common.response.MessageResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.Set;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Unit tests for AdminController endpoints.
 * Tests focus on AdminService operations (user management).
 * TeacherApplicationService operations should be tested via integration tests
 * due to complex controller-service interaction.
 */
@WebMvcTest(AdminController.class)
@Import(TestSecurityConfig.class)
class AdminControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private AdminService adminService;

    @MockBean
    private TeacherApplicationService applicationService;

    private CreateUserRequest createUserRequest;
    private MessageResponse successResponse;

    @BeforeEach
    void setUp() {
        createUserRequest = new CreateUserRequest();
        createUserRequest.setUsername("newuser");
        createUserRequest.setEmail("newuser@example.com");
        createUserRequest.setPassword("Password123!");
        createUserRequest.setFirstName("New");
        createUserRequest.setLastName("User");
        createUserRequest.setRoles(Set.of("ROLE_TEACHER"));

        successResponse = MessageResponse.builder()
                .status(HttpStatus.CREATED.value())
                .success(true)
                .message("User created successfully")
                .build();
    }

    @Nested
    @DisplayName("POST /admin/users/teacher")
    class CreateTeacherTests {

        @Test
        @WithMockUser(roles = "ADMIN")
        @DisplayName("Should create teacher successfully")
        void createTeacher_Success() throws Exception {
            when(adminService.createTeacher(any(CreateUserRequest.class))).thenReturn(successResponse);

            mockMvc.perform(post("/admin/users/teacher")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(createUserRequest)))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.success").value(true));
        }
    }

    @Nested
    @DisplayName("POST /admin/users/admin")
    class CreateAdminTests {

        @Test
        @WithMockUser(roles = "ADMIN")
        @DisplayName("Should create admin successfully")
        void createAdmin_Success() throws Exception {
            when(adminService.createAdmin(any(CreateUserRequest.class))).thenReturn(successResponse);

            mockMvc.perform(post("/admin/users/admin")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(createUserRequest)))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.success").value(true));
        }
    }

    @Nested
    @DisplayName("GET /admin/users")
    class GetAllUsersTests {

        @Test
        @WithMockUser(roles = "ADMIN")
        @DisplayName("Should return paginated users")
        void getAllUsers_Success() throws Exception {
            UserListResponse user = UserListResponse.builder()
                    .id(1L)
                    .username("user1")
                    .email("user1@example.com")
                    .build();
            Page<UserListResponse> page = new PageImpl<>(List.of(user));
            
            when(adminService.getAllUsers(anyInt(), anyInt(), anyString())).thenReturn(page);

            mockMvc.perform(get("/admin/users")
                            .param("page", "0")
                            .param("size", "10"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true));
        }
    }

    @Nested
    @DisplayName("GET /admin/users/role/{roleName}")
    class GetUsersByRoleTests {

        @Test
        @WithMockUser(roles = "ADMIN")
        @DisplayName("Should return users by role")
        void getUsersByRole_Success() throws Exception {
            UserListResponse user = UserListResponse.builder()
                    .id(1L)
                    .username("teacher1")
                    .email("teacher1@example.com")
                    .build();
            Page<UserListResponse> page = new PageImpl<>(List.of(user));

            when(adminService.getUsersByRole(eq("ROLE_TEACHER"), anyInt(), anyInt())).thenReturn(page);

            mockMvc.perform(get("/admin/users/role/ROLE_TEACHER"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true));
        }
    }

    @Nested
    @DisplayName("PUT /admin/users/{userId}/role")
    class UpdateUserRolesTests {

        @Test
        @WithMockUser(roles = "ADMIN")
        @DisplayName("Should update user roles")
        void updateUserRoles_Success() throws Exception {
            UpdateUserRoleRequest request = new UpdateUserRoleRequest();
            request.setRoles(Set.of("ROLE_TEACHER"));

            MessageResponse response = MessageResponse.builder()
                    .status(HttpStatus.OK.value())
                    .success(true)
                    .message("Roles updated")
                    .build();

            when(adminService.updateUserRoles(eq(1L), any(UpdateUserRoleRequest.class))).thenReturn(response);

            mockMvc.perform(put("/admin/users/1/role")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true));
        }
    }

    @Nested
    @DisplayName("PATCH /admin/users/{userId}/status")
    class ToggleUserStatusTests {

        @Test
        @WithMockUser(roles = "ADMIN")
        @DisplayName("Should toggle user status")
        void toggleUserStatus_Success() throws Exception {
            MessageResponse response = MessageResponse.builder()
                    .status(HttpStatus.OK.value())
                    .success(true)
                    .message("Status updated")
                    .build();

            when(adminService.toggleUserStatus(eq(1L), eq(false))).thenReturn(response);

            mockMvc.perform(patch("/admin/users/1/status")
                            .param("enabled", "false"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true));
        }
    }

    @Nested
    @DisplayName("DELETE /admin/users/{userId}")
    class DeleteUserTests {

        @Test
        @WithMockUser(roles = "ADMIN")
        @DisplayName("Should delete user")
        void deleteUser_Success() throws Exception {
            MessageResponse response = MessageResponse.builder()
                    .status(HttpStatus.OK.value())
                    .success(true)
                    .message("User deleted")
                    .build();

            when(adminService.deleteUser(1L)).thenReturn(response);

            mockMvc.perform(delete("/admin/users/1"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true));
        }
    }

    // ==================== TeacherApplicationService Endpoints ====================

    @Nested
    @DisplayName("GET /admin/applications")
    class GetAllApplicationsTests {

        @Test
        @WithMockUser(roles = "ADMIN")
        @DisplayName("Should return applications")
        void getAllApplications_Success() throws Exception {
            TeacherApplicationResponse app = TeacherApplicationResponse.builder()
                    .id(1L)
                    .firstName("John")
                    .lastName("Doe")
                    .status("PENDING")
                    .build();
            Page<TeacherApplicationResponse> page = new PageImpl<>(List.of(app));

            when(applicationService.getAllApplications(any(), anyInt(), anyInt(), anyString())).thenReturn(page);

            mockMvc.perform(get("/admin/users/applications"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data").isArray());
        }
    }

    @Nested
    @DisplayName("GET /admin/applications/{id}")
    class GetApplicationByIdTests {

        @Test
        @WithMockUser(roles = "ADMIN")
        @DisplayName("Should return application by id")
        void getApplicationById_Success() throws Exception {
            TeacherApplicationResponse app = TeacherApplicationResponse.builder()
                    .id(1L)
                    .firstName("John")
                    .lastName("Doe")
                    .status("PENDING")
                    .build();

            when(applicationService.getApplicationById(1L)).thenReturn(app);

            mockMvc.perform(get("/admin/users/applications/1"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data.id").value(1))
                    .andExpect(jsonPath("$.data.status").value("PENDING"));
        }
    }

    @Nested
    @DisplayName("POST /admin/applications/{id}/review")
    class ReviewApplicationTests {

        @Test
        @WithMockUser(roles = "ADMIN")
        @DisplayName("Should approve application")
        void reviewApplication_Approve() throws Exception {
            ReviewApplicationRequest request = new ReviewApplicationRequest();
            request.setAction("APPROVE");
            request.setTeacherType("FULL");

            MessageResponse response = MessageResponse.builder()
                    .status(HttpStatus.OK.value())
                    .success(true)
                    .message("Application approved")
                    .build();

            when(applicationService.reviewApplication(eq(1L), any(ReviewApplicationRequest.class))).thenReturn(response);

            mockMvc.perform(post("/admin/users/applications/1/review")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.message").value("Application approved"));
        }

        @Test
        @WithMockUser(roles = "ADMIN")
        @DisplayName("Should reject application")
        void reviewApplication_Reject() throws Exception {
            ReviewApplicationRequest request = new ReviewApplicationRequest();
            request.setAction("REJECT");
            request.setRejectionReason("Incomplete documents");

            MessageResponse response = MessageResponse.builder()
                    .status(HttpStatus.OK.value())
                    .success(true)
                    .message("Application rejected")
                    .build();

            when(applicationService.reviewApplication(eq(1L), any(ReviewApplicationRequest.class))).thenReturn(response);

            mockMvc.perform(post("/admin/users/applications/1/review")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true));
        }
    }

    @Nested
    @DisplayName("GET /admin/trial-teachers")
    class GetTrialTeachersTests {

        @Test
        @WithMockUser(roles = "ADMIN")
        @DisplayName("Should return trial teachers")
        void getTrialTeachers_Success() throws Exception {
            TrialStatusResponse trial = TrialStatusResponse.builder()
                    .userId(1L)
                    .username("trialteacher")
                    .isTrial(true)
                    .daysRemaining(15L)
                    .build();
            Page<TrialStatusResponse> page = new PageImpl<>(List.of(trial));

            when(applicationService.getTrialTeachers(anyInt(), anyInt())).thenReturn(page);

            mockMvc.perform(get("/admin/users/trial-teachers"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data").isArray());
        }
    }

    @Nested
    @DisplayName("POST /admin/trial-teachers/{userId}/upgrade")
    class UpgradeTrialToFullTests {

        @Test
        @WithMockUser(roles = "ADMIN")
        @DisplayName("Should upgrade trial to full teacher")
        void upgradeTrialToFull_Success() throws Exception {
            UpgradeTrialRequest request = new UpgradeTrialRequest();
            request.setReason("Excellent performance");

            MessageResponse response = MessageResponse.builder()
                    .status(HttpStatus.OK.value())
                    .success(true)
                    .message("Teacher upgraded successfully")
                    .build();

            when(applicationService.upgradeTrialToFull(eq(1L), any(UpgradeTrialRequest.class))).thenReturn(response);

            mockMvc.perform(post("/admin/users/trial-teachers/1/upgrade")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.message").value("Teacher upgraded successfully"));
        }

        @Test
        @WithMockUser(roles = "ADMIN")
        @DisplayName("Should upgrade without request body")
        void upgradeTrialToFull_NoBody() throws Exception {
            MessageResponse response = MessageResponse.builder()
                    .status(HttpStatus.OK.value())
                    .success(true)
                    .message("Teacher upgraded successfully")
                    .build();

            when(applicationService.upgradeTrialToFull(eq(1L), any(UpgradeTrialRequest.class))).thenReturn(response);

            mockMvc.perform(post("/admin/users/trial-teachers/1/upgrade")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{}"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true));
        }
    }
}
