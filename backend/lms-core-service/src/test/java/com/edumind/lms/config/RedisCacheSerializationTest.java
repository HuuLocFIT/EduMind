package com.edumind.lms.config;

import com.edumind.lms.modules.course.dto.response.CategoryResponse;
import com.edumind.lms.modules.course.dto.response.CourseDetailResponse;
import com.edumind.lms.modules.course.dto.response.LessonResponse;
import com.edumind.lms.modules.course.dto.response.SectionDetailResponse;
import com.edumind.lms.modules.course.enums.ContentType;
import com.edumind.lms.modules.course.enums.CourseLevel;
import com.edumind.lms.modules.course.enums.CourseStatus;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.cache.Cache;
import org.springframework.data.redis.cache.RedisCacheManager;
import org.springframework.data.redis.connection.RedisStandaloneConfiguration;
import org.springframework.data.redis.connection.lettuce.LettuceConnectionFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.utility.DockerImageName;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Round-trips cached values through a real Redis using the production {@link CacheConfig} settings.
 * The in-memory cache used by other tests stores object references, so it cannot catch
 * Jackson problems (LocalDateTime, BigDecimal, immutable lists, type hints).
 */
@Testcontainers
@DisplayName("Redis cache serialization")
class RedisCacheSerializationTest {

    @Container
    private static final GenericContainer<?> REDIS =
            new GenericContainer<>(DockerImageName.parse("redis:7-alpine")).withExposedPorts(6379);

    private static LettuceConnectionFactory connectionFactory;
    private static RedisCacheManager cacheManager;

    @BeforeAll
    static void startCacheManager() {
        connectionFactory = new LettuceConnectionFactory(
                new RedisStandaloneConfiguration(REDIS.getHost(), REDIS.getMappedPort(6379)));
        connectionFactory.afterPropertiesSet();
        connectionFactory.start();

        cacheManager = RedisCacheManager.builder(connectionFactory)
                .cacheDefaults(CacheConfig.defaultRedisCacheConfiguration())
                .build();
        cacheManager.afterPropertiesSet();
    }

    @AfterAll
    static void stopCacheManager() {
        connectionFactory.destroy();
    }

    @BeforeEach
    void flush() {
        connectionFactory.getConnection().serverCommands().flushAll();
    }

    @Test
    @DisplayName("CourseDetailResponse survives a Redis round trip unchanged")
    void courseDetailRoundTrip() {
        CourseDetailResponse original = sampleCourseDetail();
        Cache cache = cacheManager.getCache(CacheConfig.COURSE_DETAIL);

        cache.put(42L, original);
        CourseDetailResponse restored = cache.get(42L, CourseDetailResponse.class);

        assertThat(restored).isEqualTo(original);
    }

    @Test
    @DisplayName("keys use the lms: prefix so they can be found and evicted by pattern")
    void keyPrefix() {
        cacheManager.getCache(CacheConfig.COURSE_DETAIL).put(42L, sampleCourseDetail());

        StringRedisTemplate redis = new StringRedisTemplate(connectionFactory);
        assertThat(redis.hasKey("lms:courseDetail::42")).isTrue();
    }

    @Test
    @DisplayName("platformConfig values (BigDecimal, String) round trip")
    void platformConfigRoundTrip() {
        Cache cache = cacheManager.getCache(CacheConfig.PLATFORM_CONFIG);

        cache.put("platformFeePercent", new BigDecimal("20.50"));
        cache.put("SOME_KEY", "value");

        assertThat(cache.get("platformFeePercent", BigDecimal.class)).isEqualByComparingTo("20.50");
        assertThat(cache.get("SOME_KEY", String.class)).isEqualTo("value");
    }

    private static CourseDetailResponse sampleCourseDetail() {
        LocalDateTime now = LocalDateTime.of(2026, 10, 14, 9, 30, 15, 123_000_000);
        LessonResponse lesson = LessonResponse.builder()
                .id(7L).sectionId(3L).courseId(42L)
                .title("Intro").contentType(ContentType.VIDEO)
                .videoDuration(600)
                .orderIndex(0).isPreview(true).isMandatory(true)
                .createdAt(now).updatedAt(now)
                .build();
        SectionDetailResponse section = SectionDetailResponse.builder()
                .id(3L).courseId(42L).title("Getting started").orderIndex(0)
                .lessonCount(1).totalDurationMinutes(10)
                .lessons(List.of(lesson))
                .createdAt(now).updatedAt(now)
                .build();
        SectionDetailResponse emptySection = SectionDetailResponse.builder()
                .id(4L).courseId(42L).title("Coming soon").orderIndex(1)
                .lessonCount(0).totalDurationMinutes(0)
                .lessons(Collections.emptyList())
                .build();

        return CourseDetailResponse.builder()
                .id(42L).title("Java Caching").slug("java-caching")
                .description("Long description").shortDescription("Short")
                .instructorId(100L).instructorName("Prof. Cache")
                .category(CategoryResponse.builder().id(1L).name("Backend").slug("backend").isActive(true).build())
                .price(new BigDecimal("49.99")).currency("USD")
                .discountPrice(new BigDecimal("29.99")).effectivePrice(new BigDecimal("29.99"))
                .level(CourseLevel.values()[0]).language("en").durationHours(3)
                .status(CourseStatus.PUBLISHED).publishedAt(now)
                .hasCertificate(true).hasSubtitles(false)
                .totalLessons(1).totalStudents(12)
                .averageRating(new BigDecimal("4.75")).totalReviews(4)
                .sections(List.of(section, emptySection))
                .createdAt(now).updatedAt(now)
                .build();
    }
}
