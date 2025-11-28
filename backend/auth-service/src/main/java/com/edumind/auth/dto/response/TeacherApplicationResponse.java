package com.edumind.auth.dto.response;

import com.edumind.auth.dto.request.TeacherApplicationRequest;
import lombok.*;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TeacherApplicationResponse {
    private Long id;
    private Long userId;
    private String username;
    private String firstName;
    private String lastName;
    private String email;
    private String phone;
    private String subject;
    private Integer experienceYears;
    private String qualifications;
    private List<TeacherApplicationRequest.DocumentInfo> documents;
    private String bio;
    private String motivation;
    private String status;
    private String rejectionReason;
    private String adminNotes;
    private LocalDateTime createdAt;
    private LocalDateTime reviewedAt;
    private String reviewedBy;
}