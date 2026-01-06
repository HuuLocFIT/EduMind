package com.edumind.lms.config.security;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

@Component("teacherSecurity")
public class TeacherSecurity {

    public boolean isActiveTeacher() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null) {
            return false;
        }

        Object principal = authentication.getPrincipal();

        if (principal instanceof JwtUserPrincipal jwtPrincipal) {
            return jwtPrincipal.isActiveTeacher();
        }

        // Fallback or other principal types (though usually we expect JwtUserPrincipal)
        return authentication.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_TEACHER"));
    }

    public boolean isActiveTeacherOrAdmin() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null) {
            return false;
        }

        // Check ADMIN first
        boolean isAdmin = authentication.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
        
        if (isAdmin) {
            return true;
        }

        return isActiveTeacher();
    }

    public boolean isActiveTeacherOrAdminOrStudent(Long studentId) {
        if (isActiveTeacherOrAdmin()) {
            return true;
        }

        // Check if current user is the student
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null) {
            return false;
        }

        Object principal = authentication.getPrincipal();
        if (principal instanceof JwtUserPrincipal jwtPrincipal) {
            return jwtPrincipal.userId() != null && jwtPrincipal.userId().equals(studentId);
        }

        return false;
    }

    public boolean isActiveTeacherOrStudent(Long studentId) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null) {
            return false;
        }

        Object principal = authentication.getPrincipal();
        
        // Explicitly exclude Admin users - they should not access student/teacher-only endpoints
        if (principal instanceof JwtUserPrincipal jwtPrincipal) {
            if (jwtPrincipal.isAdmin()) {
                return false;
            }
            
            // Check if user is an active teacher (excluding Admin)
            if (jwtPrincipal.isActiveTeacher()) {
                return true;
            }
            
            // Check if current user is the student
            return jwtPrincipal.userId() != null && jwtPrincipal.userId().equals(studentId);
        } else {
            // Fallback for non-JwtUserPrincipal: check Admin role first
            boolean isAdmin = authentication.getAuthorities().stream()
                    .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
            if (isAdmin) {
                return false;
            }
            
            // Check if user is an active teacher
            if (isActiveTeacher()) {
                return true;
            }
            
            // For non-JwtUserPrincipal, we can't verify student ID match
            return false;
        }
    }
}
