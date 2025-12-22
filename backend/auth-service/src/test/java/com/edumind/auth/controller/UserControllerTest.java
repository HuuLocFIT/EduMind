package com.edumind.auth.controller;

import com.edumind.auth.config.TestSecurityConfig;
import com.edumind.auth.dto.request.ChangePasswordRequest;
import com.edumind.auth.dto.request.UpdateProfileRequest;
import com.edumind.auth.dto.response.UserResponse;
import com.edumind.auth.service.UserService;
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
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Set;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(UserController.class)
@Import(TestSecurityConfig.class)
class UserControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private UserService userService;

    private UserResponse userResponse;

    @BeforeEach
    void setUp() {
        userResponse = UserResponse.builder()
                .id(1L)
                .username("testuser")
                .email("test@example.com")
                .firstName("Test")
                .lastName("User")
                .roles(Set.of("ROLE_STUDENT"))
                .isActive(true)
                .isEmailVerified(true)
                .build();
    }

    @Nested
    @DisplayName("GET /users/me")
    class GetCurrentUserTests {

        @Test
        @WithMockUser(username = "testuser")
        @DisplayName("Should return current user details")
        void getCurrentUser_Success() throws Exception {
            when(userService.getCurrentUser()).thenReturn(userResponse);

            mockMvc.perform(get("/users/me"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data.username").value("testuser"));
        }
    }

    @Nested
    @DisplayName("GET /users/{id}")
    class GetUserByIdTests {

        @Test
        @WithMockUser(roles = "ADMIN")
        @DisplayName("Should return user by ID for admin")
        void getUserById_Success() throws Exception {
            when(userService.getUserById(1L)).thenReturn(userResponse);

            mockMvc.perform(get("/users/1"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data.id").value(1));
        }
    }

    @Nested
    @DisplayName("GET /users/{id}/public-profile")
    class GetPublicProfileTests {

        @Test
        @DisplayName("Should return public profile")
        void getPublicProfile_Success() throws Exception {
            when(userService.getUserById(1L)).thenReturn(userResponse);

            mockMvc.perform(get("/users/1/public-profile"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data.firstName").value("Test"));
        }
    }

    @Nested
    @DisplayName("PUT /users/me")
    class UpdateProfileTests {

        @Test
        @WithMockUser(username = "testuser")
        @DisplayName("Should update profile successfully")
        void updateProfile_Success() throws Exception {
            UpdateProfileRequest request = new UpdateProfileRequest();
            request.setFirstName("Updated");
            request.setLastName("Name");

            UserResponse updatedResponse = UserResponse.builder()
                    .id(1L)
                    .username("testuser")
                    .firstName("Updated")
                    .lastName("Name")
                    .build();

            when(userService.updateProfile(any(UpdateProfileRequest.class))).thenReturn(updatedResponse);

            mockMvc.perform(put("/users/me")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data.firstName").value("Updated"));
        }
    }

    @Nested
    @DisplayName("POST /users/me/change-password")
    class ChangePasswordTests {

        @Test
        @WithMockUser(username = "testuser")
        @DisplayName("Should change password successfully")
        void changePassword_Success() throws Exception {
            ChangePasswordRequest request = new ChangePasswordRequest();
            request.setCurrentPassword("OldPass123!");
            request.setNewPassword("NewPass123!");
            request.setConfirmPassword("NewPass123!");

            doNothing().when(userService).changePassword(any(ChangePasswordRequest.class));

            mockMvc.perform(post("/users/me/change-password")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true));
        }
    }

    @Nested
    @DisplayName("DELETE /users/me")
    class DeleteAccountTests {

        @Test
        @WithMockUser(username = "testuser")
        @DisplayName("Should delete account successfully")
        void deleteAccount_Success() throws Exception {
            MessageResponse response = MessageResponse.builder()
                    .status(HttpStatus.OK.value())
                    .success(true)
                    .message("Account deleted")
                    .build();

            when(userService.deleteAccount()).thenReturn(response);

            mockMvc.perform(delete("/users/me"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true));
        }
    }
}
