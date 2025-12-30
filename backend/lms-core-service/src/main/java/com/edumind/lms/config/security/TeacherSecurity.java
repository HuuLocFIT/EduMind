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
}
