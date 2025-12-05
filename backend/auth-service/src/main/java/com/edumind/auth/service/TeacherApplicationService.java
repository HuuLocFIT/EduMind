package com.edumind.auth.service;

import com.edumind.auth.dto.request.ReviewApplicationRequest;
import com.edumind.auth.dto.request.TeacherApplicationRequest;
import com.edumind.auth.dto.request.UpgradeTrialRequest;
import com.edumind.auth.dto.response.TeacherApplicationResponse;
import com.edumind.auth.dto.response.TrialStatusResponse;
import com.edumind.auth.entity.*;
import com.edumind.auth.enums.ApplicationStatus;
import com.edumind.auth.enums.RoleName;
import com.edumind.auth.repository.*;
import com.edumind.common.exception.*;
import com.edumind.common.response.MessageResponse;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.*;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.*;

@Service
public class TeacherApplicationService {
    private static final Logger logger = LoggerFactory.getLogger(TeacherApplicationService.class);
    private static final int TRIAL_DAYS = 30;

    @Autowired
    private TeacherApplicationRepository applicationRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private EmailService emailService;

    /**
     * Student/Guest submits teacher application
     */
    @Transactional
    public MessageResponse submitApplication(TeacherApplicationRequest request) {
        logger.info("🔄 Processing teacher application submission");

        // Get current user
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String username = auth.getName();
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        boolean userUpdated = false;

        if (request.getFirstName() != null && !request.getFirstName().isBlank()) {
            user.setFirstName(request.getFirstName().trim());
            userUpdated = true;
            logger.debug("Synced firstName from teacher application: {}", request.getFirstName());
        }

        if (request.getLastName() != null && !request.getLastName().isBlank()) {
            user.setLastName(request.getLastName().trim());
            userUpdated = true;
            logger.debug("Synced lastName from teacher application: {}", request.getLastName());
        }

        if (request.getPhone() != null && !request.getPhone().isBlank()) {
            user.setPhoneNumber(request.getPhone().trim());
            userUpdated = true;
            logger.debug("Synced phoneNumber from teacher application");
        }

        if (request.getBio() != null && !request.getBio().isBlank()) {
            user.setBio(request.getBio().trim());
            userUpdated = true;
            logger.debug("Synced bio from teacher application");
        }

        if (userUpdated) {
            userRepository.save(user);
            logger.info("✅ User profile synced from teacher application for username: {}", user.getUsername());
        }

        // Check if already has pending/approved application
        if (applicationRepository.existsByUser(user)) {
            Optional<TeacherApplication> existing = applicationRepository.findByUser(user);
            if (existing.isPresent()) {
                ApplicationStatus status = existing.get().getStatus();
                if (status == ApplicationStatus.PENDING) {
                    throw new BadRequestException("You already have a pending application!");
                } else if (status == ApplicationStatus.APPROVED) {
                    throw new BadRequestException("Your application was already approved!");
                }
            }
        }

        // Convert documents to JSON
        String documentsJson;
        try {
            documentsJson = objectMapper.writeValueAsString(request.getDocuments());
        } catch (JsonProcessingException e) {
            throw new BadRequestException("Invalid documents format");
        }

        // Create application
        TeacherApplication application = TeacherApplication.builder()
                .user(user)
                .firstName(request.getFirstName())
                .lastName(request.getLastName())
                .email(request.getEmail())
                .phone(request.getPhone())
                .subject(request.getSubject())
                .experienceYears(request.getExperienceYears())
                .qualifications(request.getQualifications())
                .documents(documentsJson)
                .bio(request.getBio())
                .motivation(request.getMotivation())
                .status(ApplicationStatus.PENDING)
                .build();

        applicationRepository.save(application);

        logger.info("✅ Teacher application submitted successfully by user: {}", username);

        return MessageResponse.builder()
                .status(HttpStatus.CREATED.value())
                .success(true)
                .message("Teacher application submitted successfully! Please wait for admin review.")
                .build();
    }

    /**
     * Get my application status
     */
    public TeacherApplicationResponse getMyApplication() {
        logger.info("🔄 Fetching user's teacher application");

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String username = auth.getName();
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        TeacherApplication application = applicationRepository.findByUser(user)
                .orElseThrow(() -> new ResourceNotFoundException("No application found"));

        return mapToResponse(application);
    }

    /**
     * Get current trial teacher's status
     */
    public TrialStatusResponse getMyTrialStatus() {
        logger.info("🔄 Fetching current trial teacher status");

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String username = auth.getName();

        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        long daysRemaining = 0;
        if (user.getTrialEndDate() != null) {
            daysRemaining = ChronoUnit.DAYS.between(LocalDateTime.now(), user.getTrialEndDate());
        }

        return TrialStatusResponse.builder()
                .userId(user.getId())
                .username(user.getUsername())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .isTrial(user.getIsTrial())
                .trialStartDate(user.getTrialStartDate())
                .trialEndDate(user.getTrialEndDate())
                .daysRemaining(Math.max(0, daysRemaining))
                .isExpired(user.isTrialExpired())
                .build();
    }

    /**
     * Admin: Get specific application by ID
     */
    public TeacherApplicationResponse getApplicationById(Long id) {
        logger.info("🔄 Admin fetching application details for ID: {}", id);

        TeacherApplication application = applicationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Application not found"));

        return mapToResponse(application);
    }

    /**
     * Admin: Get all applications with filtering
     */
    public Page<TeacherApplicationResponse> getAllApplications(
            String status, int page, int size, String sortBy) {

        logger.info("🔄 Admin fetching applications - status: {}", status);

        Pageable pageable = PageRequest.of(page, size, Sort.by(sortBy).descending());

        Page<TeacherApplication> applications;
        if (status != null && !status.isEmpty()) {
            ApplicationStatus appStatus =
                    ApplicationStatus.valueOf(status.toUpperCase());
            applications = applicationRepository.findByStatus(appStatus, pageable);
        } else {
            applications = applicationRepository.findAll(pageable);
        }

        return applications.map(this::mapToResponse);
    }

    /**
     * Admin: Review application (Approve or Reject)
     */
    @Transactional
    public MessageResponse reviewApplication(Long applicationId, ReviewApplicationRequest request) {
        logger.info("🔄 Admin reviewing application ID: {} - Action: {}", applicationId, request.getAction());

        TeacherApplication application = applicationRepository.findById(applicationId)
                .orElseThrow(() -> new ResourceNotFoundException("Application not found"));

        if (application.getStatus() != ApplicationStatus.PENDING) {
            throw new BadRequestException("This application has already been reviewed!");
        }

        // Get admin user
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String adminUsername = auth.getName();
        User admin = userRepository.findByUsername(adminUsername)
                .orElseThrow(() -> new ResourceNotFoundException("Admin not found"));

        if ("APPROVE".equals(request.getAction())) {
            return approveApplication(application, admin, request);
        } else if ("REJECT".equals(request.getAction())) {
            return rejectApplication(application, admin, request);
        } else {
            throw new BadRequestException("Invalid action!");
        }
    }

    /**
     * Approve application and create teacher account
     */
    private MessageResponse approveApplication(
            TeacherApplication application, User admin, ReviewApplicationRequest request) {

        User applicant = application.getUser();
        logger.info("✅ Approving application for user: {}", applicant.getUsername());

        // Update application status
        application.setStatus(ApplicationStatus.APPROVED);
        application.setReviewedBy(admin);
        application.setReviewedAt(LocalDateTime.now());
        application.setAdminNotes(request.getAdminNotes());

        // Determine role based on teacherType
        RoleName roleName;
        boolean isTrial = "TRIAL".equals(request.getTeacherType());
        if (isTrial) {
            roleName = RoleName.ROLE_TEACHER_TRIAL;

            // Set trial period (30 days)
            applicant.setIsTrial(true);
            applicant.setTrialStartDate(LocalDateTime.now());
            applicant.setTrialEndDate(LocalDateTime.now().plusDays(TRIAL_DAYS));

            logger.info("📅 Setting trial period: 30 days from now");
        } else {
            roleName = RoleName.ROLE_TEACHER;
            applicant.setIsTrial(false);
        }

        // Assign role
        Role teacherRole = roleRepository.findByName(roleName)
                .orElseThrow(() -> new ResourceNotFoundException("Role not found: " + roleName));

        Set<Role> roles = new HashSet<>(applicant.getRoles());
        roles.add(teacherRole);
        applicant.setRoles(roles);

        userRepository.save(applicant);
        applicationRepository.save(application);

        try {
            emailService.sendApplicationApprovedEmail(applicant, isTrial, applicant.getTrialEndDate());
            logger.info("📧 Approval email sent to: {}", applicant.getEmail());
        } catch (Exception e) {
            logger.error("❌ Failed to send approval email", e);
            // Don't fail the approval if email fails
        }

        String message = isTrial
                ? "Application approved! Teacher account created with 30-day trial period."
                : "Application approved! Full teacher account created successfully.";

        logger.info("✅ Application approved and {} account created for: {}", roleName, applicant.getUsername());

        return MessageResponse.builder()
                .status(HttpStatus.OK.value())
                .success(true)
                .message(message)
                .build();
    }

    /**
     * Reject application
     */
    private MessageResponse rejectApplication(
            TeacherApplication application, User admin, ReviewApplicationRequest request) {

        logger.info("❌ Rejecting application ID: {}", application.getId());

        if (request.getRejectionReason() == null || request.getRejectionReason().isBlank()) {
            throw new BadRequestException("Rejection reason is required!");
        }

        application.setStatus(ApplicationStatus.REJECTED);
        application.setReviewedBy(admin);
        application.setReviewedAt(LocalDateTime.now());
        application.setRejectionReason(request.getRejectionReason());
        application.setAdminNotes(request.getAdminNotes());

        applicationRepository.save(application);

        try {
            emailService.sendApplicationRejectedEmail(application.getUser(), request.getRejectionReason());
            logger.info("📧 Rejection email sent to: {}", application.getUser().getEmail());
        } catch (Exception e) {
            logger.error("❌ Failed to send rejection email", e);
            // Don't fail the rejection if email fails
        }

        logger.info("✅ Application rejected for user: {}", application.getUser().getUsername());

        return MessageResponse.builder()
                .status(HttpStatus.OK.value())
                .success(true)
                .message("Application rejected successfully.")
                .build();
    }

    /**
     * Admin: Upgrade trial teacher to full teacher
     */
    @Transactional
    public MessageResponse upgradeTrialToFull(Long userId, UpgradeTrialRequest request) {
        logger.info("🔄 Admin upgrading trial teacher to full - User ID: {}", userId);

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        // Check if user is trial teacher
        if (!user.getIsTrial()) {
            throw new BadRequestException("User is not in trial period!");
        }

        boolean hasTrialRole = user.getRoles().stream()
                .anyMatch(role -> role.getName() == RoleName.ROLE_TEACHER_TRIAL);

        if (!hasTrialRole) {
            throw new BadRequestException("User does not have TEACHER_TRIAL role!");
        }

        // Remove TEACHER_TRIAL role
        Role trialRole = roleRepository.findByName(RoleName.ROLE_TEACHER_TRIAL)
                .orElseThrow(() -> new ResourceNotFoundException("TEACHER_TRIAL role not found"));

        // Add TEACHER role
        Role teacherRole = roleRepository.findByName(RoleName.ROLE_TEACHER)
                .orElseThrow(() -> new ResourceNotFoundException("TEACHER role not found"));

        Set<Role> roles = new HashSet<>(user.getRoles());
        roles.remove(trialRole);
        roles.add(teacherRole);
        user.setRoles(roles);

        // Clear trial fields
        user.setIsTrial(false);
        user.setTrialStartDate(null);
        user.setTrialEndDate(null);

        userRepository.save(user);

        logger.info("✅ Trial teacher upgraded to full teacher: {}", user.getUsername());

        return MessageResponse.builder()
                .status(HttpStatus.OK.value())
                .success(true)
                .message("Teacher successfully upgraded from trial to full access!")
                .build();
    }

    /**
     * Get trial teachers (for admin to monitor)
     */
    public Page<TrialStatusResponse> getTrialTeachers(int page, int size) {
        logger.info("🔄 Admin fetching trial teachers");

        Role trialRole = roleRepository.findByName(RoleName.ROLE_TEACHER_TRIAL)
                .orElseThrow(() -> new ResourceNotFoundException("TEACHER_TRIAL role not found"));

        Pageable pageable = PageRequest.of(page, size, Sort.by("trialEndDate").ascending());
        Page<User> trialUsers = userRepository.findByRolesContaining(trialRole, pageable);

        return trialUsers.map(user -> {
            long daysRemaining = 0;
            if (user.getTrialEndDate() != null) {
                daysRemaining = ChronoUnit.DAYS.between(LocalDateTime.now(), user.getTrialEndDate());
            }

            return TrialStatusResponse.builder()
                    .userId(user.getId())
                    .username(user.getUsername())
                    .firstName(user.getFirstName())
                    .lastName(user.getLastName())
                    .isTrial(user.getIsTrial())
                    .trialStartDate(user.getTrialStartDate())
                    .trialEndDate(user.getTrialEndDate())
                    .daysRemaining(Math.max(0, daysRemaining))
                    .isExpired(user.isTrialExpired())
                    .build();
        });
    }

    /**
     * Helper: Map entity to response
     */
    private TeacherApplicationResponse mapToResponse(TeacherApplication app) {
        List<TeacherApplicationRequest.DocumentInfo> docs = null;
        if (app.getDocuments() != null) {
            try {
                docs = objectMapper.readValue(
                        app.getDocuments(),
                        objectMapper.getTypeFactory().constructCollectionType(
                                List.class, TeacherApplicationRequest.DocumentInfo.class
                        )
                );
            } catch (JsonProcessingException e) {
                logger.error("Error parsing documents JSON", e);
            }
        }

        return TeacherApplicationResponse.builder()
                .id(app.getId())
                .userId(app.getUser().getId())
                .username(app.getUser().getUsername())
                .firstName(app.getFirstName())
                .lastName(app.getLastName())
                .email(app.getEmail())
                .phone(app.getPhone())
                .subject(app.getSubject())
                .experienceYears(app.getExperienceYears())
                .qualifications(app.getQualifications())
                .documents(docs)
                .bio(app.getBio())
                .motivation(app.getMotivation())
                .status(app.getStatus().name())
                .rejectionReason(app.getRejectionReason())
                .adminNotes(app.getAdminNotes())
                .createdAt(app.getCreatedAt())
                .reviewedAt(app.getReviewedAt())
                .reviewedBy(app.getReviewedBy() != null ? app.getReviewedBy().getUsername() : null)
                .build();
    }
}