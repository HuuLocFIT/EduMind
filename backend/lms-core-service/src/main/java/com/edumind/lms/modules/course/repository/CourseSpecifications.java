package com.edumind.lms.modules.course.repository;

import com.edumind.lms.modules.course.entity.Course;
import com.edumind.lms.modules.course.enums.CourseLevel;
import com.edumind.lms.modules.course.enums.CourseStatus;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.List;
import java.util.Objects;

/**
 * JPA Specifications for dynamic course filtering.
 * Composable predicates that can be combined using Specification.where().and()...
 */
public class CourseSpecifications {

    /**
     * Filter by published status
     */
    public static Specification<Course> hasStatus(CourseStatus status) {
        return (root, query, cb) -> cb.equal(root.get("status"), status);
    }

    /**
     * Filter by multiple categories (IN clause)
     */
    public static Specification<Course> inCategories(List<Long> categoryIds) {
        return (root, query, cb) -> {
            if (categoryIds == null || categoryIds.isEmpty()) {
                return cb.conjunction(); // No filter
            }
            return root.get("category").get("id").in(categoryIds);
        };
    }

    /**
     * Filter by multiple levels (IN clause)
     */
    public static Specification<Course> inLevels(List<CourseLevel> levels) {
        return (root, query, cb) -> {
            if (levels == null || levels.isEmpty()) {
                return cb.conjunction(); // No filter
            }

            EnumSet<CourseLevel> selectedLevels = levels.stream()
                    .filter(Objects::nonNull)
                    .collect(() -> EnumSet.noneOf(CourseLevel.class), EnumSet::add, EnumSet::addAll);

            if (selectedLevels.isEmpty()) {
                return cb.conjunction();
            }

            EnumSet<CourseLevel> specificLevels = EnumSet.of(
                    CourseLevel.BEGINNER,
                    CourseLevel.INTERMEDIATE,
                    CourseLevel.ADVANCED);

            // Selecting all specific levels is equivalent to no level filter.
            if (selectedLevels.containsAll(specificLevels)) {
                return cb.conjunction();
            }

            // "All levels" courses should match every specific level filter.
            selectedLevels.add(CourseLevel.ALL_LEVELS);

            return root.get("level").in(selectedLevels);
        };
    }

    /**
     * Filter by price range
     */
    public static Specification<Course> inPriceRange(BigDecimal minPrice, BigDecimal maxPrice) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            
            if (minPrice != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("price"), minPrice));
            }
            
            if (maxPrice != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("price"), maxPrice));
            }
            
            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    /**
     * Filter by keyword (searches in title and description)
     */
    public static Specification<Course> hasKeyword(String keyword) {
        return (root, query, cb) -> {
            if (keyword == null || keyword.trim().isEmpty()) {
                return cb.conjunction(); // No filter
            }
            
            String searchPattern = "%" + keyword.toLowerCase() + "%";
            return cb.or(
                cb.like(cb.lower(root.get("title")), searchPattern),
                cb.like(cb.lower(root.get("description")), searchPattern)
            );
        };
    }

    /**
     * Filter by minimum rating
     */
    public static Specification<Course> minRating(Double minRating) {
        return (root, query, cb) -> {
            if (minRating == null) {
                return cb.conjunction(); // No filter
            }
            return cb.greaterThanOrEqualTo(root.get("averageRating"), BigDecimal.valueOf(minRating));
        };
    }
}
