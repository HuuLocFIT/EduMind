package com.edumind.lms.modules.course.service;

import com.edumind.lms.config.PostgresTestContainerConfig;
import com.edumind.lms.modules.course.entity.Category;
import com.edumind.lms.modules.course.entity.Course;
import com.edumind.lms.modules.course.enums.CourseStatus;
import com.edumind.lms.modules.course.repository.CategoryRepository;
import com.edumind.lms.modules.course.repository.CourseRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.cache.CacheManager;
import org.springframework.data.redis.cache.RedisCacheManager;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * With the Redis cache enabled but Redis unreachable, course detail must still be served from the DB.
 */
@SpringBootTest(properties = {
        "spring.cache.type=redis",
        "spring.data.redis.host=localhost",
        "spring.data.redis.port=1",            // nothing listens here
        "spring.data.redis.timeout=200ms",
        "spring.data.redis.connect-timeout=200ms"
})
@AutoConfigureMockMvc
@ContextConfiguration(initializers = PostgresTestContainerConfig.Initializer.class)
@ActiveProfiles("test")
@DisplayName("Course detail cache with Redis down")
class CourseDetailCacheRedisDownTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private CacheManager cacheManager;
    @Autowired private CategoryRepository categoryRepository;
    @Autowired private CourseRepository courseRepository;
    @Autowired private CourseService courseService;

    private Category category;
    private Course course;

    @BeforeEach
    void setUp() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        category = categoryRepository.save(Category.builder()
                .name("Redis Down " + suffix).slug("redis-down-" + suffix).isActive(true).build());
        course = courseRepository.save(Course.builder()
                .title("Redis Down Course").slug("redis-down-course-" + suffix)
                .description("Served from DB").instructorId(9002L).instructorName("Tester")
                .category(category).price(new BigDecimal("9.99")).currency("USD")
                .status(CourseStatus.PUBLISHED).publishedAt(LocalDateTime.now())
                .totalLessons(0).totalStudents(0).totalReviews(0)
                .build());
    }

    @AfterEach
    void cleanUp() {
        courseRepository.deleteById(course.getId());
        categoryRepository.deleteById(category.getId());
    }

    @Test
    @DisplayName("reads fall back to the DB and writes still succeed")
    void fallsBackToDatabase() throws Exception {
        assertThat(cacheManager).isInstanceOf(RedisCacheManager.class);

        mockMvc.perform(get("/courses/slug/{slug}", course.getSlug()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.description").value("Served from DB"));

        // The after-commit eviction fails too; it must not turn a committed write into an error
        courseService.updateCourse(course.getId(),
                Course.builder().description("Updated while Redis is down").build(), 9002L);

        mockMvc.perform(get("/courses/{id}", course.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.description").value("Updated while Redis is down"));
    }
}
