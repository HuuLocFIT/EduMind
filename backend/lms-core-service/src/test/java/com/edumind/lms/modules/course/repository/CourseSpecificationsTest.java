package com.edumind.lms.modules.course.repository;

import com.edumind.lms.config.BaseRepositoryTest;
import com.edumind.lms.modules.course.entity.Category;
import com.edumind.lms.modules.course.entity.Course;
import com.edumind.lms.modules.course.enums.CourseLevel;
import com.edumind.lms.modules.course.enums.CourseStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.jpa.domain.Specification;

import java.math.BigDecimal;
import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("CourseSpecifications Level Filter Tests")
class CourseSpecificationsTest extends BaseRepositoryTest {

    @Autowired
    private CourseRepository courseRepository;

    @Autowired
    private TestEntityManager entityManager;

    private Course publishedBeginner;
    private Course publishedIntermediate;
    private Course publishedAdvanced;
    private Course publishedAllLevels;

    @BeforeEach
    void setUp() {
        Category category = Category.builder()
                .name("Development")
                .slug("development")
                .isActive(true)
                .build();
        entityManager.persist(category);

        publishedBeginner = persistCourse("beginner-course", CourseLevel.BEGINNER, CourseStatus.PUBLISHED, category);
        publishedIntermediate = persistCourse("intermediate-course", CourseLevel.INTERMEDIATE, CourseStatus.PUBLISHED, category);
        publishedAdvanced = persistCourse("advanced-course", CourseLevel.ADVANCED, CourseStatus.PUBLISHED, category);
        publishedAllLevels = persistCourse("all-levels-course", CourseLevel.ALL_LEVELS, CourseStatus.PUBLISHED, category);

        // Draft course should never appear in browse filtering.
        persistCourse("draft-beginner-course", CourseLevel.BEGINNER, CourseStatus.DRAFT, category);

        entityManager.flush();
        entityManager.clear();
    }

    @Test
    @DisplayName("Should include ALL_LEVELS when filtering a specific level")
    void inLevels_WhenSpecificLevelSelected_ShouldIncludeAllLevelsCourse() {
        Specification<Course> spec = CourseSpecifications.hasStatus(CourseStatus.PUBLISHED)
                .and(CourseSpecifications.inLevels(List.of(CourseLevel.BEGINNER)));

        Page<Course> result = courseRepository.findAll(spec, PageRequest.of(0, 20));

        assertThat(result.getContent())
                .extracting(Course::getSlug)
                .containsExactlyInAnyOrder(
                        publishedBeginner.getSlug(),
                        publishedAllLevels.getSlug())
                .doesNotContain(
                        publishedIntermediate.getSlug(),
                        publishedAdvanced.getSlug());
    }

    @Test
    @DisplayName("Should treat selecting all specific levels as no level filter")
    void inLevels_WhenAllSpecificLevelsSelected_ShouldBehaveAsNoLevelFilter() {
        Specification<Course> noLevelFilterSpec = CourseSpecifications.hasStatus(CourseStatus.PUBLISHED);
        Specification<Course> allSpecificLevelsSpec = CourseSpecifications.hasStatus(CourseStatus.PUBLISHED)
                .and(CourseSpecifications.inLevels(List.of(
                        CourseLevel.BEGINNER,
                        CourseLevel.INTERMEDIATE,
                        CourseLevel.ADVANCED)));

        Page<Course> noLevelFilterResult = courseRepository.findAll(noLevelFilterSpec, PageRequest.of(0, 20));
        Page<Course> allSpecificLevelsResult = courseRepository.findAll(allSpecificLevelsSpec, PageRequest.of(0, 20));

        Set<Long> expectedIds = noLevelFilterResult.map(Course::getId).stream().collect(java.util.stream.Collectors.toSet());
        Set<Long> actualIds = allSpecificLevelsResult.map(Course::getId).stream().collect(java.util.stream.Collectors.toSet());

        assertThat(actualIds).isEqualTo(expectedIds);
        assertThat(allSpecificLevelsResult.getContent())
                .extracting(Course::getSlug)
                .contains(
                        publishedBeginner.getSlug(),
                        publishedIntermediate.getSlug(),
                        publishedAdvanced.getSlug(),
                        publishedAllLevels.getSlug());
    }

    @Test
    @DisplayName("Should only return ALL_LEVELS when filtering by ALL_LEVELS")
    void inLevels_WhenFilteringAllLevelsOnly_ShouldReturnAllLevelsCourses() {
        Specification<Course> spec = CourseSpecifications.hasStatus(CourseStatus.PUBLISHED)
                .and(CourseSpecifications.inLevels(List.of(CourseLevel.ALL_LEVELS)));

        Page<Course> result = courseRepository.findAll(spec, PageRequest.of(0, 20));

        assertThat(result.getContent())
                .extracting(Course::getSlug)
                .containsExactly(publishedAllLevels.getSlug());
    }

    private Course persistCourse(String slug, CourseLevel level, CourseStatus status, Category category) {
        Course course = new Course();
        course.setTitle(slug.replace('-', ' '));
        course.setSlug(slug);
        course.setDescription("Course description for " + slug);
        course.setShortDescription("Short description for " + slug);
        course.setInstructorId(100L);
        course.setInstructorName("Test Instructor");
        course.setCategory(category);
        course.setPrice(BigDecimal.TEN);
        course.setCurrency("USD");
        course.setLevel(level);
        course.setLanguage("en");
        course.setStatus(status);
        course.setHasCertificate(false);
        course.setHasSubtitles(false);
        course.setTotalLessons(1);
        course.setTotalStudents(0);
        course.setTotalReviews(0);
        course.setAverageRating(null);
        return entityManager.persist(course);
    }
}
