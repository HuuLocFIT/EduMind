package com.edumind.lms.modules.course.controller;

import com.edumind.common.response.PagedResponse;
import com.edumind.lms.modules.course.dto.response.CourseResponse;
import com.edumind.lms.modules.course.entity.Course;
import com.edumind.lms.modules.course.enums.CourseLevel;
import com.edumind.lms.modules.course.enums.CourseStatus;
import com.edumind.lms.modules.course.service.CourseService;
import com.edumind.lms.modules.course.util.CourseMapper;
import jakarta.validation.constraints.Max;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/admin/courses")
@RequiredArgsConstructor
public class AdminCourseController {
    private final CourseService courseService;
    private final CourseMapper courseMapper;

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<PagedResponse<CourseResponse>> listCourses(
            @RequestParam(required = false) List<Long> categoryIds,
            @RequestParam(required = false) List<CourseLevel> levels,
            @RequestParam(required = false) CourseStatus status,
            @RequestParam(required = false) String keyword,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") @Max(100) int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "DESC") String sortDir) {
        Sort sort = Sort.by(sortDir.equalsIgnoreCase("ASC") ? Sort.Direction.ASC : Sort.Direction.DESC, sortBy);
        Page<Course> courses = courseService.getAdminCourses(categoryIds, levels, status, keyword,
                PageRequest.of(page, size, sort));
        Page<CourseResponse> response = courses.map(courseMapper::toResponse);
        return ResponseEntity.ok(PagedResponse.of(response.getContent(), response.getNumber(), response.getSize(),
                response.getTotalElements(), response.getTotalPages()));
    }
}
