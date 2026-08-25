package com.edumind.auth.service;

import com.edumind.auth.dto.request.ReviewApplicationRequest;
import com.edumind.auth.dto.request.TeacherApplicationRequest;
import com.edumind.auth.dto.request.UpgradeTrialRequest;
import com.edumind.auth.dto.response.TeacherApplicationResponse;
import com.edumind.auth.entity.ApplicationStatusHistory;
import com.edumind.auth.entity.Role;
import com.edumind.auth.entity.TeacherApplication;
import com.edumind.auth.entity.User;
import com.edumind.auth.enums.ApplicationStatus;
import com.edumind.auth.enums.RoleName;
import com.edumind.auth.event.ApplicationApprovedEmailRequested;
import com.edumind.auth.event.ApplicationRejectedEmailRequested;
import com.edumind.auth.event.EmailPayloadFactory;
import com.edumind.auth.repository.ApplicationStatusHistoryRepository;
import com.edumind.auth.repository.RoleRepository;
import com.edumind.auth.repository.TeacherApplicationRepository;
import com.edumind.auth.repository.UserRepository;
import com.edumind.common.exception.BadRequestException;
import com.edumind.common.exception.ResourceNotFoundException;
import com.edumind.common.response.MessageResponse;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;

import java.time.LocalDateTime;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TeacherApplicationServiceTest {

    @Mock
    private TeacherApplicationRepository applicationRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private RoleRepository roleRepository;

    @Mock
    private ApplicationStatusHistoryRepository statusHistoryRepository;

    @Mock
    private ObjectMapper objectMapper;

    @Mock
    private EmailService emailService;

    @Mock
    private Authentication authentication;

    @Mock
    private SecurityContext securityContext;

    @Mock
    private EmailPayloadFactory emailPayloadFactory;

    @Mock
    private ApplicationEventPublisher eventPublisher;

    @InjectMocks
    private TeacherApplicationService teacherApplicationService;

    private User testUser;
    private User adminUser;
    private Role studentRole;
    private Role teacherRole;
    private Role teacherTrialRole;

    @BeforeEach
    void setUp() {
        studentRole = Role.builder().id(1L).name(RoleName.ROLE_STUDENT).build();
        teacherRole = Role.builder().id(2L).name(RoleName.ROLE_TEACHER).build();
        teacherTrialRole = Role.builder().id(3L).name(RoleName.ROLE_TEACHER_TRIAL).build();

        testUser = User.builder()
                .id(1L)
                .username("testuser")
                .email("test@example.com")
                .roles(new HashSet<>(Set.of(studentRole)))
                .build();

        adminUser = User.builder()
                .id(2L)
                .username("admin")
                .email("admin@example.com")
                .roles(new HashSet<>(Set.of(Role.builder().name(RoleName.ROLE_ADMIN).build())))
                .build();

        lenient().when(userRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(testUser));
    }
    
    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    private void mockSecurityContext(String username) {
        when(securityContext.getAuthentication()).thenReturn(authentication);
        when(authentication.getName()).thenReturn(username);
        SecurityContextHolder.setContext(securityContext);
    }

    @Nested
    @DisplayName("submitApplication Tests")
    class SubmitApplicationTests {

        @Test
        @DisplayName("Should submit application successfully")
        void submitApplication_Success() throws JsonProcessingException {
            // Given
            mockSecurityContext("testuser");
            TeacherApplicationRequest request = new TeacherApplicationRequest();
            request.setFirstName("First");
            request.setLastName("Last");
            request.setEmail("test@email.com");
            request.setPhone("123456789");
            request.setDocuments(new ArrayList<>());
            
            when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(testUser));
            when(applicationRepository.findTopByUserOrderByIdDesc(testUser)).thenReturn(Optional.empty());
            when(objectMapper.writeValueAsString(any())).thenReturn("[]");
            when(applicationRepository.saveAndFlush(any(TeacherApplication.class))).thenAnswer(i -> i.getArguments()[0]);

            // When
            MessageResponse response = teacherApplicationService.submitApplication(request);

            // Then
            assertEquals(HttpStatus.CREATED.value(), response.getStatus());
            assertTrue(response.isSuccess());
            verify(userRepository).findByIdForUpdate(testUser.getId());
            verify(applicationRepository).saveAndFlush(any(TeacherApplication.class));
            verify(statusHistoryRepository).save(any(ApplicationStatusHistory.class));
        }

        @Test
        @DisplayName("Should fail if pending application exists")
        void submitApplication_Fail_PendingExists() {
            // Given
            mockSecurityContext("testuser");
            TeacherApplicationRequest request = new TeacherApplicationRequest();
            
            TeacherApplication pendingApp = TeacherApplication.builder()
                    .user(testUser)
                    .status(ApplicationStatus.PENDING)
                    .build();

            when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(testUser));
            when(applicationRepository.findTopByUserOrderByIdDesc(testUser)).thenReturn(Optional.of(pendingApp));

            // When/Then
            BadRequestException ex = assertThrows(BadRequestException.class, () -> 
                teacherApplicationService.submitApplication(request));
            assertEquals("You already have a pending application!", ex.getMessage());
        }

        @Test
        @DisplayName("Should fail if application already approved")
        void submitApplication_Fail_AlreadyApproved() {
            // Given
            mockSecurityContext("testuser");
            TeacherApplicationRequest request = new TeacherApplicationRequest();

            TeacherApplication approvedApp = TeacherApplication.builder()
                    .user(testUser)
                    .status(ApplicationStatus.APPROVED)
                    .build();

            when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(testUser));
            when(applicationRepository.findTopByUserOrderByIdDesc(testUser)).thenReturn(Optional.of(approvedApp));

            // When/Then
            BadRequestException ex = assertThrows(BadRequestException.class, () ->
                    teacherApplicationService.submitApplication(request));
            assertEquals("Your application was already approved!", ex.getMessage());
        }

        @Test
        @DisplayName("Should fail when user not found")
        void submitApplication_Fail_UserNotFound() {
            // Given
            mockSecurityContext("missingUser");
            when(userRepository.findByUsername("missingUser")).thenReturn(Optional.empty());

            // When/Then
            assertThrows(ResourceNotFoundException.class, () ->
                    teacherApplicationService.submitApplication(new TeacherApplicationRequest()));
        }

        @Test
        @DisplayName("Should fail when documents JSON is invalid")
        void submitApplication_Fail_InvalidDocuments() throws JsonProcessingException {
            // Given
            mockSecurityContext("testuser");
            TeacherApplicationRequest request = new TeacherApplicationRequest();

            when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(testUser));
            when(applicationRepository.findTopByUserOrderByIdDesc(testUser)).thenReturn(Optional.empty());
            when(objectMapper.writeValueAsString(any()))
                    .thenThrow(new JsonProcessingException("JSON error") {});

            // When/Then
            BadRequestException ex = assertThrows(BadRequestException.class, () ->
                    teacherApplicationService.submitApplication(request));
            assertEquals("Invalid documents format", ex.getMessage());
        }

        @Test
        @DisplayName("Should allow reapplication after latest application was rejected")
        void submitApplication_ReapplyAfterRejected() throws JsonProcessingException {
            mockSecurityContext("testuser");
            TeacherApplicationRequest request = validApplicationRequest();
            TeacherApplication rejected = TeacherApplication.builder()
                    .id(10L).user(testUser).status(ApplicationStatus.REJECTED).build();

            when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(testUser));
            when(applicationRepository.findTopByUserOrderByIdDesc(testUser)).thenReturn(Optional.of(rejected));
            when(objectMapper.writeValueAsString(any())).thenReturn("[]");
            when(applicationRepository.saveAndFlush(any(TeacherApplication.class))).thenAnswer(i -> i.getArgument(0));

            MessageResponse response = teacherApplicationService.submitApplication(request);

            assertEquals(HttpStatus.CREATED.value(), response.getStatus());
            verify(applicationRepository).saveAndFlush(argThat(a -> a.getStatus() == ApplicationStatus.PENDING));
        }

        @Test
        @DisplayName("Should translate only the pending-application unique index violation")
        void submitApplication_PendingConstraintViolation() throws JsonProcessingException {
            mockSecurityContext("testuser");
            TeacherApplicationRequest request = validApplicationRequest();
            when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(testUser));
            when(applicationRepository.findTopByUserOrderByIdDesc(testUser)).thenReturn(Optional.empty());
            when(objectMapper.writeValueAsString(any())).thenReturn("[]");
            var cause = new org.hibernate.exception.ConstraintViolationException(
                    "duplicate", new SQLException("duplicate"), "idx_teacher_app_one_pending_per_user");
            when(applicationRepository.saveAndFlush(any())).thenThrow(new DataIntegrityViolationException("duplicate", cause));

            BadRequestException exception = assertThrows(BadRequestException.class,
                    () -> teacherApplicationService.submitApplication(request));
            assertEquals("You already have a pending application!", exception.getMessage());
        }

        @Test
        @DisplayName("Should preserve unrelated integrity violations")
        void submitApplication_UnrelatedConstraintViolation() throws JsonProcessingException {
            mockSecurityContext("testuser");
            TeacherApplicationRequest request = validApplicationRequest();
            when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(testUser));
            when(applicationRepository.findTopByUserOrderByIdDesc(testUser)).thenReturn(Optional.empty());
            when(objectMapper.writeValueAsString(any())).thenReturn("[]");
            var cause = new org.hibernate.exception.ConstraintViolationException(
                    "duplicate", new SQLException("duplicate"), "some_other_constraint");
            DataIntegrityViolationException expected = new DataIntegrityViolationException("duplicate", cause);
            when(applicationRepository.saveAndFlush(any())).thenThrow(expected);

            assertSame(expected, assertThrows(DataIntegrityViolationException.class,
                    () -> teacherApplicationService.submitApplication(request)));
        }

        private TeacherApplicationRequest validApplicationRequest() {
            TeacherApplicationRequest request = new TeacherApplicationRequest();
            request.setFirstName("First");
            request.setLastName("Last");
            request.setEmail("test@email.com");
            request.setPhone("123456789");
            request.setSubject("Mathematics");
            request.setDocuments(new ArrayList<>());
            return request;
        }
    }

    @Nested
    @DisplayName("reviewApplication Tests")
    class ReviewApplicationTests {

        @Test
        @DisplayName("Should approve application successfully")
        void reviewApplication_Approve() {
            // Given
            mockSecurityContext("admin");
            Long appId = 1L;
            ReviewApplicationRequest request = new ReviewApplicationRequest();
            request.setAction("APPROVE");
            request.setTeacherType("FULL");

            TeacherApplication application = TeacherApplication.builder()
                    .id(appId)
                    .user(testUser)
                    .status(ApplicationStatus.PENDING)
                    .build();

            when(applicationRepository.findById(appId)).thenReturn(Optional.of(application));
            when(userRepository.findByUsername("admin")).thenReturn(Optional.of(adminUser));
            when(roleRepository.findByName(RoleName.ROLE_TEACHER)).thenReturn(Optional.of(teacherRole));

            // When
            MessageResponse response = teacherApplicationService.reviewApplication(appId, request);

            // Then
            assertEquals(HttpStatus.OK.value(), response.getStatus());
            assertEquals(ApplicationStatus.APPROVED, application.getStatus());
            assertTrue(testUser.getRoles().contains(teacherRole));
            verify(eventPublisher).publishEvent(argThat((Object event) ->
                    event instanceof ApplicationApprovedEmailRequested approved && !approved.trial()));
        }

        @Test
        @DisplayName("Should reject application successfully")
        void reviewApplication_Reject() {
            // Given
            mockSecurityContext("admin");
            Long appId = 1L;
            ReviewApplicationRequest request = new ReviewApplicationRequest();
            request.setAction("REJECT");
            request.setRejectionReason("Not qualified");

            TeacherApplication application = TeacherApplication.builder()
                    .id(appId)
                    .user(testUser)
                    .status(ApplicationStatus.PENDING)
                    .build();

            when(applicationRepository.findById(appId)).thenReturn(Optional.of(application));
            when(userRepository.findByUsername("admin")).thenReturn(Optional.of(adminUser));

            // When
            MessageResponse response = teacherApplicationService.reviewApplication(appId, request);

            // Then
            assertEquals(HttpStatus.OK.value(), response.getStatus());
            assertEquals(ApplicationStatus.REJECTED, application.getStatus());
            assertEquals("Not qualified", application.getRejectionReason());
            verify(eventPublisher).publishEvent(argThat((Object event) ->
                    event instanceof ApplicationRejectedEmailRequested rejected
                            && "Not qualified".equals(rejected.reason())));
        }
        
        @Test
        @DisplayName("Should fail if application already reviewed")
        void reviewApplication_Fail_AlreadyReviewed() {
            // Given
            Long appId = 1L;
            TeacherApplication application = TeacherApplication.builder()
                    .id(appId)
                    .status(ApplicationStatus.APPROVED)
                    .build();
            
            when(applicationRepository.findById(appId)).thenReturn(Optional.of(application));

            // When/Then
            BadRequestException ex = assertThrows(BadRequestException.class, () -> 
                teacherApplicationService.reviewApplication(appId, new ReviewApplicationRequest()));
            assertEquals("This application has already been reviewed!", ex.getMessage());
        }

        @Test
        @DisplayName("Should approve application as trial teacher")
        void reviewApplication_ApproveTrial() {
            // Given
            mockSecurityContext("admin");
            Long appId = 1L;
            ReviewApplicationRequest request = new ReviewApplicationRequest();
            request.setAction("APPROVE");
            request.setTeacherType("TRIAL");

            TeacherApplication application = TeacherApplication.builder()
                    .id(appId)
                    .user(testUser)
                    .status(ApplicationStatus.PENDING)
                    .build();

            when(applicationRepository.findById(appId)).thenReturn(Optional.of(application));
            when(userRepository.findByUsername("admin")).thenReturn(Optional.of(adminUser));
            when(roleRepository.findByName(RoleName.ROLE_TEACHER_TRIAL)).thenReturn(Optional.of(teacherTrialRole));

            // When
            MessageResponse response = teacherApplicationService.reviewApplication(appId, request);

            // Then
            assertEquals(HttpStatus.OK.value(), response.getStatus());
            assertEquals(ApplicationStatus.APPROVED, application.getStatus());
            assertTrue(testUser.getIsTrial());
            assertTrue(testUser.getRoles().contains(teacherTrialRole));
            verify(eventPublisher).publishEvent(argThat((Object event) ->
                    event instanceof ApplicationApprovedEmailRequested approved && approved.trial()));
        }

        @Test
        @DisplayName("Should fail when rejection reason is missing")
        void reviewApplication_Reject_MissingReason() {
            // Given
            mockSecurityContext("admin");
            Long appId = 1L;
            ReviewApplicationRequest request = new ReviewApplicationRequest();
            request.setAction("REJECT");
            request.setRejectionReason("  "); // blank

            TeacherApplication application = TeacherApplication.builder()
                    .id(appId)
                    .user(testUser)
                    .status(ApplicationStatus.PENDING)
                    .build();

            when(applicationRepository.findById(appId)).thenReturn(Optional.of(application));
            when(userRepository.findByUsername("admin")).thenReturn(Optional.of(adminUser));

            // When/Then
            BadRequestException ex = assertThrows(BadRequestException.class, () ->
                    teacherApplicationService.reviewApplication(appId, request));
            assertEquals("Rejection reason is required!", ex.getMessage());
        }

        @Test
        @DisplayName("Should fail when action is invalid")
        void reviewApplication_Fail_InvalidAction() {
            // Given
            mockSecurityContext("admin");
            Long appId = 1L;
            ReviewApplicationRequest request = new ReviewApplicationRequest();
            request.setAction("UNKNOWN");

            TeacherApplication application = TeacherApplication.builder()
                    .id(appId)
                    .user(testUser)
                    .status(ApplicationStatus.PENDING)
                    .build();

            when(applicationRepository.findById(appId)).thenReturn(Optional.of(application));
            when(userRepository.findByUsername("admin")).thenReturn(Optional.of(adminUser));

            // When/Then
            BadRequestException ex = assertThrows(BadRequestException.class, () ->
                    teacherApplicationService.reviewApplication(appId, request));
            assertEquals("Invalid action!", ex.getMessage());
        }
    }

    @Nested
    @DisplayName("getMyApplication Tests")
    class GetMyApplicationTests {

        @Test
        @DisplayName("Should return my application")
        void getMyApplication_Success() {
            // Given
            mockSecurityContext("testuser");
            TeacherApplication application = TeacherApplication.builder()
                    .id(1L)
                    .user(testUser)
                    .status(ApplicationStatus.PENDING)
                    .firstName("Test")
                    .lastName("User")
                    .email("test@email.com")
                    .build();

            when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(testUser));
            when(applicationRepository.findTopByUserOrderByIdDesc(testUser)).thenReturn(Optional.of(application));

            // When
            TeacherApplicationResponse response = teacherApplicationService.getMyApplication();

            // Then
            assertNotNull(response);
            assertEquals(1L, response.getId());
            assertEquals("PENDING", response.getStatus());
        }

        @Test
        @DisplayName("Should fail when user not found")
        void getMyApplication_Fail_UserNotFound() {
            // Given
            mockSecurityContext("unknown");
            when(userRepository.findByUsername("unknown")).thenReturn(Optional.empty());

            // When/Then
            assertThrows(ResourceNotFoundException.class, () ->
                    teacherApplicationService.getMyApplication());
        }

        @Test
        @DisplayName("Should return null when application not found")
        void getMyApplication_Fail_ApplicationNotFound() {
            // Given
            mockSecurityContext("testuser");
            when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(testUser));
            when(applicationRepository.findTopByUserOrderByIdDesc(testUser)).thenReturn(Optional.empty());

            // When
            TeacherApplicationResponse response = teacherApplicationService.getMyApplication();

            // Then
            assertNull(response);
        }
    }

    @Nested
    @DisplayName("getMyTrialStatus Tests")
    class GetMyTrialStatusTests {

        @Test
        @DisplayName("Should return trial status successfully")
        void getMyTrialStatus_Success() {
            // Given
            mockSecurityContext("testuser");
            testUser.setIsTrial(true);
            testUser.setTrialStartDate(LocalDateTime.now().minusDays(5));
            testUser.setTrialEndDate(LocalDateTime.now().plusDays(10));

            when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(testUser));

            // When
            var result = teacherApplicationService.getMyTrialStatus();

            // Then
            assertEquals(testUser.getId(), result.getUserId());
            assertEquals(testUser.getUsername(), result.getUsername());
            assertTrue(result.getDaysRemaining() >= 0);
        }

        @Test
        @DisplayName("Should fail when user not found")
        void getMyTrialStatus_Fail_UserNotFound() {
            // Given
            mockSecurityContext("unknown");
            when(userRepository.findByUsername("unknown")).thenReturn(Optional.empty());

            // When/Then
            assertThrows(ResourceNotFoundException.class, () ->
                    teacherApplicationService.getMyTrialStatus());
        }
    }

    @Test
    @DisplayName("getApplicationById should fail when not found")
    void getApplicationById_Fail_NotFound() {
        // Given
        when(applicationRepository.findById(1L)).thenReturn(Optional.empty());

        // When/Then
        assertThrows(ResourceNotFoundException.class, () ->
                teacherApplicationService.getApplicationById(1L));
    }

    @Nested
    @DisplayName("upgradeTrialToFull Tests")
    class UpgradeTrialToFullTests {

        @Test
        @DisplayName("Should upgrade trial teacher to full")
        void upgradeTrialToFull_Success() {
            // Given
            mockSecurityContext("admin");
            UpgradeTrialRequest request = new UpgradeTrialRequest();
            request.setReason("Good performance");

            testUser.setIsTrial(true);
            testUser.getRoles().add(teacherTrialRole);

            when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));
            when(userRepository.findByUsername("admin")).thenReturn(Optional.of(adminUser));
            when(roleRepository.findByName(RoleName.ROLE_TEACHER_TRIAL)).thenReturn(Optional.of(teacherTrialRole));
            when(roleRepository.findByName(RoleName.ROLE_TEACHER)).thenReturn(Optional.of(teacherRole));
            when(applicationRepository.findTopByUserOrderByIdDesc(testUser)).thenReturn(Optional.empty()); // No app recorded

            // When
            MessageResponse response = teacherApplicationService.upgradeTrialToFull(1L, request);

            // Then
            assertEquals(HttpStatus.OK.value(), response.getStatus());
            assertFalse(testUser.getIsTrial());
            assertTrue(testUser.getRoles().contains(teacherRole));
            assertFalse(testUser.getRoles().contains(teacherTrialRole));
        }

        @Test
        @DisplayName("Should fail if user is not on trial")
        void upgradeTrialToFull_Fail_NotTrial() {
             // Given
             mockSecurityContext("admin");
             testUser.setIsTrial(false);
             when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));
             when(userRepository.findByUsername("admin")).thenReturn(Optional.of(adminUser));
             
             // When/Then
             BadRequestException ex = assertThrows(BadRequestException.class, () -> 
                 teacherApplicationService.upgradeTrialToFull(1L, new UpgradeTrialRequest()));
             assertEquals("User is not in trial period!", ex.getMessage());
        }

        @Test
        @DisplayName("Should fail if user not found")
        void upgradeTrialToFull_Fail_UserNotFound() {
            // Given
            when(userRepository.findById(1L)).thenReturn(Optional.empty());

            // When/Then
            assertThrows(ResourceNotFoundException.class, () ->
                    teacherApplicationService.upgradeTrialToFull(1L, new UpgradeTrialRequest()));
        }

        @Test
        @DisplayName("Should fail if user does not have trial role")
        void upgradeTrialToFull_Fail_NoTrialRole() {
            // Given
            mockSecurityContext("admin");
            testUser.setIsTrial(true);
            // roles only contain studentRole from setUp, no teacherTrialRole

            when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));
            when(userRepository.findByUsername("admin")).thenReturn(Optional.of(adminUser));

            // When/Then
            BadRequestException ex = assertThrows(BadRequestException.class, () ->
                    teacherApplicationService.upgradeTrialToFull(1L, new UpgradeTrialRequest()));
            assertEquals("User does not have TEACHER_TRIAL role!", ex.getMessage());
        }
    }
}
