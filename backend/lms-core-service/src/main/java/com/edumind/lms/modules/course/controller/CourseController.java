package com.edumind.lms.modules.course.controller;

import com.edumind.common.response.ApiResponse;
import com.edumind.common.response.PagedResponse;
import com.edumind.lms.modules.course.dto.request.CreateCourseRequest;
import com.edumind.lms.modules.course.dto.request.UpdateCourseRequest;
import com.edumind.lms.modules.course.dto.response.CourseDetailResponse;
import com.edumind.lms.modules.course.dto.response.CourseResponse;
import com.edumind.lms.modules.course.dto.response.InstructorStatsResponse;
import com.edumind.lms.modules.course.entity.Category;
import com.edumind.lms.modules.course.entity.Course;
import com.edumind.lms.modules.course.enums.CourseLevel;
import com.edumind.lms.modules.course.service.CategoryService;
import com.edumind.lms.modules.course.service.CourseService;
import com.edumind.lms.modules.course.util.CategoryMapper;
import com.edumind.lms.modules.course.util.CourseMapper;
import com.edumind.lms.modules.course.service.InstructorNameResolver;
import com.edumind.lms.shared.exception.UnauthorizedException;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@Validated
@RequestMapping("/courses")
@RequiredArgsConstructor
public class CourseController {
        private final CourseService courseService;
        private final CategoryService categoryService;
        private final CourseMapper courseMapper;
        private final CategoryMapper categoryMapper;
        private final InstructorNameResolver instructorNameResolver;

        @PostMapping
        @PreAuthorize("@teacherSecurity.isActiveTeacher()")
        public ResponseEntity<ApiResponse<CourseResponse>> createCourse(
                        @Valid @RequestBody CreateCourseRequest request,
                        Authentication authentication) {

                log.info("Creating course: {}", request.getTitle());

                Long instructorId = Long.valueOf(authentication.getPrincipal().toString());
                String instructorName = instructorNameResolver.resolveInstructorName(instructorId);

                // Get category
                Category category = categoryService.getCategoryById(request.getCategoryId());

                // Create course
                Course course = courseMapper.toEntity(request, category, instructorName);
                Course created = courseService.createCourse(course, instructorId);

                CourseResponse response = courseMapper.toResponse(created);

                return ResponseEntity
                                .status(HttpStatus.CREATED)
                                .body(ApiResponse.success("Course created successfully", response));
        }

        @PutMapping("/{id}")
        @PreAuthorize("@teacherSecurity.isActiveTeacher()")
        public ResponseEntity<ApiResponse<CourseResponse>> updateCourse(
                        @PathVariable Long id,
                        @Valid @RequestBody UpdateCourseRequest request,
                        Authentication authentication) {

                log.info("Updating course: {}", id);

                Long instructorId = Long.valueOf(authentication.getPrincipal().toString());

                // Create course update from request
                Course courseUpdate = courseMapper.toUpdateEntity(request);
                Course saved = courseService.updateCourse(id, courseUpdate, instructorId);
                CourseResponse response = courseMapper.toResponse(saved);

                return ResponseEntity.ok(ApiResponse.success("Course updated successfully", response));
        }

        @PostMapping("/{id}/publish")
        @PreAuthorize("@teacherSecurity.isActiveTeacher()")
        public ResponseEntity<ApiResponse<CourseResponse>> publishCourse(
                        @PathVariable Long id,
                        Authentication authentication) {

                log.info("Publishing course: {}", id);

                Long instructorId = Long.valueOf(authentication.getPrincipal().toString());
                Course published = courseService.publishCourse(id, instructorId);

                CourseResponse response = courseMapper.toResponse(published);
                return ResponseEntity.ok(ApiResponse.success("Course published successfully", response));
        }

        @DeleteMapping("/{id}")
        @PreAuthorize("@teacherSecurity.isActiveTeacherOrAdmin()")
        public ResponseEntity<ApiResponse<Void>> deleteCourse(
                        @PathVariable Long id,
                        Authentication authentication) {

                log.info("Deleting course: {}", id);

                Long userId = Long.valueOf(authentication.getPrincipal().toString());
                boolean isAdmin = authentication.getAuthorities().stream()
                                .map(GrantedAuthority::getAuthority)
                                .anyMatch(role -> "ROLE_ADMIN".equals(role));

                courseService.deleteCourse(id, userId, isAdmin ? "ADMIN" : "TEACHER");

                return ResponseEntity.ok(ApiResponse.success("Course deleted successfully", null));
        }

        @GetMapping("/{id}")
        @Transactional(readOnly = true)
        public ResponseEntity<ApiResponse<CourseDetailResponse>> getCourseById(
                        @PathVariable Long id) {
                log.info("Getting course: {}", id);

                Course course = courseService.getCourseById(id);
                CourseDetailResponse response = courseMapper.toDetailResponse(course, categoryMapper);

                return ResponseEntity.ok(ApiResponse.success(response));
        }

        @GetMapping("/slug/{slug}")
        @Transactional(readOnly = true)
        public ResponseEntity<ApiResponse<CourseDetailResponse>> getCourseBySlug(@PathVariable String slug) {
                log.info("Getting course by slug: {}", slug);

                Course course = courseService.getCourseBySlug(slug);
                CourseDetailResponse response = courseMapper.toDetailResponse(course, categoryMapper);

                return ResponseEntity.ok(ApiResponse.success(response));
        }

        @GetMapping("/search")
        public ResponseEntity<PagedResponse<CourseResponse>> searchCourses(
                        @RequestParam(required = false) String keyword,
                        @RequestParam(defaultValue = "0") int page,
                        @RequestParam(defaultValue = "10") @Max(100) int size,
                        @RequestParam(defaultValue = "createdAt") String sortBy,
                        @RequestParam(defaultValue = "DESC") String sortDir) {

                log.info("Searching courses with keyword: {}", keyword);

                Sort sort = Sort.by(sortDir.equalsIgnoreCase("ASC") ? Sort.Direction.ASC : Sort.Direction.DESC, sortBy);
                Pageable pageable = PageRequest.of(page, size, sort);

                Page<Course> coursePage = courseService.searchPublishedCourses(keyword, pageable);
                Page<CourseResponse> responsePage = coursePage.map(courseMapper::toResponse);

                return ResponseEntity.ok(PagedResponse.of(
                                responsePage.getContent(),
                                responsePage.getNumber(),
                                responsePage.getSize(),
                                responsePage.getTotalElements(),
                                responsePage.getTotalPages()));
        }

        @GetMapping("/filter")
        public ResponseEntity<PagedResponse<CourseResponse>> filterCourses(
                        @RequestParam(required = false) List<Long> categoryIds,
                        @RequestParam(required = false) List<CourseLevel> levels,
                        @RequestParam(required = false) BigDecimal minPrice,
                        @RequestParam(required = false) BigDecimal maxPrice,
                        @RequestParam(required = false) String keyword,
                        @RequestParam(required = false) Double minRating,
                        @RequestParam(defaultValue = "0") int page,
                        @RequestParam(defaultValue = "10") @Max(100) int size,
                        @RequestParam(defaultValue = "createdAt") String sortBy,
                        @RequestParam(defaultValue = "DESC") String sortDir) {

                log.info("Filtering courses - categories: {}, levels: {}, price: {}-{}, keyword: {}, minRating: {}, sort: {} {}",
                                categoryIds, levels, minPrice, maxPrice, keyword, minRating, sortBy, sortDir);

                Sort.Direction direction = sortDir.equalsIgnoreCase("ASC") ? Sort.Direction.ASC : Sort.Direction.DESC;
                Sort sort;

                // Map frontend sort values to database fields
                switch (sortBy.toLowerCase()) {
                        case "price":
                        case "price-low":
                        case "price-high":
                                sort = Sort.by(direction, "price");
                                break;
                        case "rating":
                                sort = Sort.by(direction, "averageRating");
                                break;
                        case "popular":
                                sort = Sort.by(direction, "totalStudents");
                                break;
                        case "latest":
                        case "newest":
                        default:
                                sort = Sort.by(direction, "createdAt");
                                break;
                }

                Pageable pageable = PageRequest.of(page, size, sort);

                Page<Course> coursePage = courseService.getCoursesWithFilters(
                                categoryIds, levels, minPrice, maxPrice, keyword, minRating, pageable);
                Page<CourseResponse> responsePage = coursePage.map(courseMapper::toResponse);

                return ResponseEntity.ok(PagedResponse.of(
                                responsePage.getContent(),
                                responsePage.getNumber(),
                                responsePage.getSize(),
                                responsePage.getTotalElements(),
                                responsePage.getTotalPages()));
        }

        @GetMapping("/category/{categoryId}")
        public ResponseEntity<PagedResponse<CourseResponse>> getCoursesByCategory(
                        @PathVariable Long categoryId,
                        @RequestParam(defaultValue = "0") int page,
                        @RequestParam(defaultValue = "10") @Max(100) int size) {

                log.info("Getting courses for category: {}", categoryId);

                Pageable pageable = PageRequest.of(page, size, Sort.by("publishedAt").descending());
                Page<Course> coursePage = courseService.getPublishedCoursesByCategory(categoryId, pageable);
                Page<CourseResponse> responsePage = coursePage.map(courseMapper::toResponse);

                return ResponseEntity.ok(PagedResponse.of(
                                responsePage.getContent(),
                                responsePage.getNumber(),
                                responsePage.getSize(),
                                responsePage.getTotalElements(),
                                responsePage.getTotalPages()));
        }

        @GetMapping("/instructor/{instructorId}")
        @PreAuthorize("@teacherSecurity.isActiveTeacherOrAdmin()")
        public ResponseEntity<PagedResponse<CourseResponse>> getCoursesByInstructor(
                        @PathVariable Long instructorId,
                        @RequestParam(defaultValue = "0") int page,
                        @RequestParam(defaultValue = "10") @Max(100) int size,
                        Authentication authentication) {

                log.info("Getting courses for instructor: {}", instructorId);

                Long currentUserId = Long.valueOf(authentication.getPrincipal().toString());
                boolean isAdmin = authentication.getAuthorities().stream()
                                .map(GrantedAuthority::getAuthority)
                                .anyMatch(role -> "ROLE_ADMIN".equals(role));

                if (!isAdmin && !instructorId.equals(currentUserId)) {
                        throw new UnauthorizedException("You are not allowed to view courses for this instructor");
                }

                Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
                Page<Course> coursePage = courseService.getCoursesByInstructor(instructorId, pageable);
                Page<CourseResponse> responsePage = coursePage.map(courseMapper::toResponse);

                return ResponseEntity.ok(PagedResponse.of(
                                responsePage.getContent(),
                                responsePage.getNumber(),
                                responsePage.getSize(),
                                responsePage.getTotalElements(),
                                responsePage.getTotalPages()));
        }

        @GetMapping("/instructor/{instructorId}/picker")
        @PreAuthorize("@teacherSecurity.isActiveTeacherOrAdmin()")
        public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getInstructorCoursePicker(
                        @PathVariable Long instructorId,
                        Authentication authentication) {

                log.info("Getting course picker for instructor: {}", instructorId);

                Long currentUserId = Long.valueOf(authentication.getPrincipal().toString());
                boolean isAdmin = authentication.getAuthorities().stream()
                                .map(GrantedAuthority::getAuthority)
                                .anyMatch(role -> "ROLE_ADMIN".equals(role));

                if (!isAdmin && !instructorId.equals(currentUserId)) {
                        throw new UnauthorizedException("You are not allowed to view courses for this instructor");
                }

                List<Map<String, Object>> courses = courseService.getInstructorCoursePicker(instructorId);

                return ResponseEntity.ok(ApiResponse.success(courses));
        }

        @GetMapping("/top-rated")
        public ResponseEntity<PagedResponse<CourseResponse>> getTopRatedCourses(
                        @RequestParam(defaultValue = "0") int page,
                        @RequestParam(defaultValue = "10") @Max(100) int size) {

                log.info("Getting top-rated courses");

                Pageable pageable = PageRequest.of(page, size);
                Page<Course> coursePage = courseService.getTopRatedCourses(pageable);
                Page<CourseResponse> responsePage = coursePage.map(courseMapper::toResponse);

                return ResponseEntity.ok(PagedResponse.of(
                                responsePage.getContent(),
                                responsePage.getNumber(),
                                responsePage.getSize(),
                                responsePage.getTotalElements(),
                                responsePage.getTotalPages()));
        }

        @GetMapping("/most-popular")
        public ResponseEntity<PagedResponse<CourseResponse>> getMostPopularCourses(
                        @RequestParam(defaultValue = "0") int page,
                        @RequestParam(defaultValue = "10") @Max(100) int size) {

                log.info("Getting most popular courses");

                Pageable pageable = PageRequest.of(page, size);
                Page<Course> coursePage = courseService.getMostPopularCourses(pageable);
                Page<CourseResponse> responsePage = coursePage.map(courseMapper::toResponse);

                return ResponseEntity.ok(PagedResponse.of(
                                responsePage.getContent(),
                                responsePage.getNumber(),
                                responsePage.getSize(),
                                responsePage.getTotalElements(),
                                responsePage.getTotalPages()));
        }

        @GetMapping("/newest")
        public ResponseEntity<PagedResponse<CourseResponse>> getNewestCourses(
                        @RequestParam(defaultValue = "0") int page,
                        @RequestParam(defaultValue = "10") @Max(100) int size) {

                log.info("Getting newest courses");

                Pageable pageable = PageRequest.of(page, size);
                Page<Course> coursePage = courseService.getNewestCourses(pageable);
                Page<CourseResponse> responsePage = coursePage.map(courseMapper::toResponse);

                return ResponseEntity.ok(PagedResponse.of(
                                responsePage.getContent(),
                                responsePage.getNumber(),
                                responsePage.getSize(),
                                responsePage.getTotalElements(),
                                responsePage.getTotalPages()));
        }

        @GetMapping("/free")
        public ResponseEntity<PagedResponse<CourseResponse>> getFreeCourses(
                        @RequestParam(defaultValue = "0") int page,
                        @RequestParam(defaultValue = "10") @Max(100) int size) {

                log.info("Getting free courses");

                Pageable pageable = PageRequest.of(page, size);
                Page<Course> coursePage = courseService.getFreeCourses(pageable);
                Page<CourseResponse> responsePage = coursePage.map(courseMapper::toResponse);

                return ResponseEntity.ok(PagedResponse.of(
                                responsePage.getContent(),
                                responsePage.getNumber(),
                                responsePage.getSize(),
                                responsePage.getTotalElements(),
                                responsePage.getTotalPages()));
        }

        @GetMapping("/instructors/{instructorId}/stats")
        public ResponseEntity<ApiResponse<InstructorStatsResponse>> getInstructorStats(
                        @PathVariable Long instructorId) {

                log.info("Getting stats for instructor: {}", instructorId);

                InstructorStatsResponse stats = courseService.getInstructorStats(instructorId);

                return ResponseEntity.ok(ApiResponse.success(
                                "Instructor stats retrieved successfully",
                                stats));
        }
}
