package com.edumind.lms.modules.course.service;

import com.edumind.lms.config.CacheConfig;
import com.edumind.lms.config.PostgresTestContainerConfig;
import com.edumind.lms.modules.course.dto.response.CourseDetailResponse;
import com.edumind.lms.modules.course.dto.response.SectionDetailResponse;
import com.edumind.lms.modules.course.entity.Category;
import com.edumind.lms.modules.course.entity.Course;
import com.edumind.lms.modules.course.entity.Lesson;
import com.edumind.lms.modules.course.entity.Section;
import com.edumind.lms.modules.course.enums.ContentType;
import com.edumind.lms.modules.course.enums.CourseStatus;
import com.edumind.lms.modules.course.repository.CategoryRepository;
import com.edumind.lms.modules.course.repository.CourseRepository;
import com.edumind.lms.modules.course.repository.LessonRepository;
import com.edumind.lms.modules.course.repository.SectionRepository;
import jakarta.persistence.EntityManagerFactory;
import org.hibernate.SessionFactory;
import org.hibernate.stat.Statistics;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Course detail cache: hits skip the DB, writes evict after commit, drafts are never cached,
 * and visibility is still enforced on cached entries.
 *
 * <p>Not {@code @Transactional}: eviction runs on AFTER_COMMIT, so every write must really commit.
 * Data is created with unique slugs and removed in {@link #cleanUp()}.
 */
@SpringBootTest(properties = "spring.jpa.properties.hibernate.generate_statistics=true")
@AutoConfigureMockMvc
@ContextConfiguration(initializers = PostgresTestContainerConfig.Initializer.class)
@ActiveProfiles("test")
@DisplayName("Course detail cache")
class CourseDetailCacheIntegrationTest {

    private static final Long INSTRUCTOR_ID = 9001L;

    @Autowired private MockMvc mockMvc;
    @Autowired private CourseDetailCacheService courseDetailCacheService;
    @Autowired private CourseService courseService;
    @Autowired private SectionService sectionService;
    @Autowired private LessonService lessonService;
    @Autowired private CategoryRepository categoryRepository;
    @Autowired private CourseRepository courseRepository;
    @Autowired private SectionRepository sectionRepository;
    @Autowired private LessonRepository lessonRepository;
    @Autowired private CacheManager cacheManager;
    @Autowired private EntityManagerFactory entityManagerFactory;

    private Category category;
    private Course course;
    private Section firstSection;
    private Section secondSection;
    private Lesson firstLesson;
    private Cache cache;
    private final List<Long> createdCourseIds = new ArrayList<>();

    @BeforeEach
    void setUp() {
        cache = cacheManager.getCache(CacheConfig.COURSE_DETAIL);
        cache.clear();

        String suffix = UUID.randomUUID().toString().substring(0, 8);
        category = categoryRepository.save(Category.builder()
                .name("Cache Category " + suffix)
                .slug("cache-category-" + suffix)
                .isActive(true)
                .build());
        course = saveCourse("cache-course-" + suffix, CourseStatus.PUBLISHED);

        firstSection = saveSection(course, "Section A", 0);
        secondSection = saveSection(course, "Section B", 1);
        firstLesson = saveLesson(firstSection, "Lesson A1", 0);
        saveLesson(secondSection, "Lesson B1", 0);
    }

    @AfterEach
    void cleanUp() {
        // Course cascades to sections and lessons
        createdCourseIds.forEach(courseRepository::deleteById);
        createdCourseIds.clear();
        categoryRepository.deleteById(category.getId());
        cache.clear();
    }

    @Test
    @DisplayName("second read is served from cache without any SQL")
    void secondReadHitsCache() {
        CourseDetailResponse first = courseDetailCacheService.getDetail(course.getId());
        assertThat(cache.get(course.getId())).isNotNull();

        Statistics stats = statistics();
        stats.clear();
        CourseDetailResponse second = courseDetailCacheService.getDetail(course.getId());

        assertThat(stats.getPrepareStatementCount()).isZero();
        assertThat(second).isEqualTo(first);
    }

    @Test
    @DisplayName("slug and id endpoints share one cache entry keyed by id")
    void slugReadSharesIdKey() throws Exception {
        mockMvc.perform(get("/courses/slug/{slug}", course.getSlug()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id").value(course.getId()));

        assertThat(cache.get(course.getId())).isNotNull();
    }

    @Test
    @DisplayName("course update evicts the entry and the next read sees new data")
    void courseUpdateEvicts() {
        courseDetailCacheService.getDetail(course.getId());

        courseService.updateCourse(course.getId(),
                Course.builder().description("Updated description").build(), INSTRUCTOR_ID);

        assertThat(cache.get(course.getId())).isNull();
        assertThat(courseDetailCacheService.getDetail(course.getId()).getDescription())
                .isEqualTo("Updated description");
    }

    @Test
    @DisplayName("lesson update evicts the parent course entry")
    void lessonUpdateEvicts() {
        courseDetailCacheService.getDetail(course.getId());

        lessonService.updateLesson(firstLesson.getId(), Lesson.builder().title("Renamed lesson").build(), INSTRUCTOR_ID);

        assertThat(cache.get(course.getId())).isNull();
        CourseDetailResponse detail = courseDetailCacheService.getDetail(course.getId());
        assertThat(detail.getSections().get(0).getLessons().get(0).getTitle()).isEqualTo("Renamed lesson");
    }

    @Test
    @DisplayName("section reorder (no domain event) evicts the entry")
    void sectionReorderEvicts() {
        courseDetailCacheService.getDetail(course.getId());

        sectionService.reorderSections(course.getId(),
                List.of(secondSection.getId(), firstSection.getId()), INSTRUCTOR_ID);

        assertThat(cache.get(course.getId())).isNull();
        List<String> titles = courseDetailCacheService.getDetail(course.getId()).getSections().stream()
                .map(SectionDetailResponse::getTitle)
                .toList();
        assertThat(titles).containsExactly("Section B", "Section A");
    }

    @Test
    @DisplayName("draft courses are never cached")
    void draftNotCached() {
        Course draft = saveCourse("cache-draft-" + UUID.randomUUID().toString().substring(0, 8), CourseStatus.DRAFT);

        CourseDetailResponse detail = courseDetailCacheService.getDetail(draft.getId());

        assertThat(detail.getStatus()).isEqualTo(CourseStatus.DRAFT);
        assertThat(cache.get(draft.getId())).isNull();
    }

    @Test
    @DisplayName("archived course returns 404 to anonymous users even if it was cached while published")
    void archivedCourseHiddenAfterBeingCached() throws Exception {
        mockMvc.perform(get("/courses/{id}", course.getId())).andExpect(status().isOk());
        assertThat(cache.get(course.getId())).isNotNull();

        courseService.archiveCourse(course.getId(), INSTRUCTOR_ID, "TEACHER", null);

        mockMvc.perform(get("/courses/{id}", course.getId())).andExpect(status().isNotFound());
        mockMvc.perform(get("/courses/slug/{slug}", course.getSlug())).andExpect(status().isNotFound());
    }

    private Statistics statistics() {
        return entityManagerFactory.unwrap(SessionFactory.class).getStatistics();
    }

    private Course saveCourse(String slug, CourseStatus status) {
        Course saved = courseRepository.save(Course.builder()
                .title("Course " + slug)
                .slug(slug)
                .description("Original description")
                .instructorId(INSTRUCTOR_ID)
                .instructorName("Cache Tester")
                .category(category)
                .price(new BigDecimal("19.99"))
                .currency("USD")
                .status(status)
                .publishedAt(status == CourseStatus.PUBLISHED ? LocalDateTime.now() : null)
                .totalLessons(2)
                .totalStudents(0)
                .totalReviews(0)
                .build());
        createdCourseIds.add(saved.getId());
        return saved;
    }

    private Section saveSection(Course owner, String title, int orderIndex) {
        return sectionRepository.save(Section.builder()
                .course(owner)
                .title(title)
                .orderIndex(orderIndex)
                .build());
    }

    private Lesson saveLesson(Section section, String title, int orderIndex) {
        return lessonRepository.save(Lesson.builder()
                .section(section)
                .course(section.getCourse())
                .title(title)
                .contentType(ContentType.ARTICLE)
                .articleContent("Body of " + title)
                .orderIndex(orderIndex)
                .isPreview(false)
                .isMandatory(true)
                .build());
    }
}
