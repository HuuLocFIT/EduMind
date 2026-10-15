package com.edumind.lms.config;

import com.fasterxml.jackson.annotation.JsonTypeInfo;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.databind.json.JsonMapper;
import com.fasterxml.jackson.databind.jsontype.BasicPolymorphicTypeValidator;
import com.fasterxml.jackson.databind.jsontype.PolymorphicTypeValidator;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.cache.RedisCacheManagerBuilderCustomizer;
import org.springframework.cache.Cache;
import org.springframework.cache.annotation.CachingConfigurer;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.interceptor.CacheErrorHandler;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.Ordered;
import org.springframework.data.redis.cache.BatchStrategies;
import org.springframework.data.redis.cache.RedisCacheConfiguration;
import org.springframework.data.redis.cache.RedisCacheWriter;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.serializer.GenericJackson2JsonRedisSerializer;
import org.springframework.data.redis.serializer.RedisSerializationContext.SerializationPair;
import org.springframework.data.redis.serializer.StringRedisSerializer;

import java.time.Duration;

/**
 * Spring Cache setup. The cache provider comes from {@code spring.cache.type}:
 * Redis in dev/prod, an in-memory map in tests, {@code none} to switch caching off.
 *
 * <p>The caching advisor runs just outside the transaction advisor
 * ({@code LOWEST_PRECEDENCE - 1}), so a cache hit never opens a transaction or borrows a
 * DB connection, and {@code @CacheEvict} runs after the surrounding transaction commits.
 */
@Slf4j
@Configuration
@EnableCaching(order = Ordered.LOWEST_PRECEDENCE - 1)
public class CacheConfig implements CachingConfigurer {

    public static final String COURSE_DETAIL = "courseDetail";
    public static final String PLATFORM_CONFIG = "platformConfig";

    private static final String KEY_PREFIX = "lms:";
    private static final Duration DEFAULT_TTL = Duration.ofMinutes(10);
    // Safety net in case an invalidation path is missed; events evict much sooner.
    private static final Duration COURSE_DETAIL_TTL = Duration.ofMinutes(10);
    private static final Duration PLATFORM_CONFIG_TTL = Duration.ofHours(1);

    /** Default settings for every Redis cache; Spring Boot picks this bean up automatically. */
    @Bean
    public RedisCacheConfiguration redisCacheConfiguration() {
        return defaultRedisCacheConfiguration();
    }

    @Bean
    public RedisCacheManagerBuilderCustomizer redisCacheCustomizer(RedisConnectionFactory connectionFactory) {
        return builder -> builder
                // cache.clear() uses SCAN instead of the default KEYS, which blocks Redis
                .cacheWriter(RedisCacheWriter.nonLockingRedisCacheWriter(connectionFactory, BatchStrategies.scan(1000)))
                .withCacheConfiguration(COURSE_DETAIL, defaultRedisCacheConfiguration().entryTtl(COURSE_DETAIL_TTL))
                .withCacheConfiguration(PLATFORM_CONFIG, defaultRedisCacheConfiguration().entryTtl(PLATFORM_CONFIG_TTL));
    }

    /**
     * A cache failure (Redis down, timeout, bad payload) must never fail the request.
     * Log it and let the annotated method fall through to the database.
     */
    @Override
    public CacheErrorHandler errorHandler() {
        return new CacheErrorHandler() {
            @Override
            public void handleCacheGetError(RuntimeException e, Cache cache, Object key) {
                log.warn("Cache GET failed for {}::{}, falling back to DB: {}", cache.getName(), key, e.getMessage());
            }

            @Override
            public void handleCachePutError(RuntimeException e, Cache cache, Object key, Object value) {
                log.warn("Cache PUT failed for {}::{}: {}", cache.getName(), key, e.getMessage());
            }

            @Override
            public void handleCacheEvictError(RuntimeException e, Cache cache, Object key) {
                log.warn("Cache EVICT failed for {}::{}: {}", cache.getName(), key, e.getMessage());
            }

            @Override
            public void handleCacheClearError(RuntimeException e, Cache cache) {
                log.warn("Cache CLEAR failed for {}: {}", cache.getName(), e.getMessage());
            }
        };
    }

    /** Keys look like {@code lms:courseDetail::42}; values are JSON with type hints. */
    static RedisCacheConfiguration defaultRedisCacheConfiguration() {
        return RedisCacheConfiguration.defaultCacheConfig()
                .entryTtl(DEFAULT_TTL)
                .computePrefixWith(cacheName -> KEY_PREFIX + cacheName + "::")
                .disableCachingNullValues()
                .serializeKeysWith(SerializationPair.fromSerializer(new StringRedisSerializer()))
                .serializeValuesWith(SerializationPair.fromSerializer(
                        new GenericJackson2JsonRedisSerializer(cacheObjectMapper())));
    }

    /**
     * Dedicated mapper for cache values, separate from the HTTP mapper so the API's
     * date format can change without breaking entries already in Redis.
     * Default typing is needed to read values back as their concrete classes; the
     * validator limits which classes a payload may name, so a tampered entry cannot
     * make Jackson instantiate arbitrary types.
     */
    static ObjectMapper cacheObjectMapper() {
        PolymorphicTypeValidator typeValidator = BasicPolymorphicTypeValidator.builder()
                .allowIfSubType("com.edumind.")
                .allowIfSubType("java.util.")
                .allowIfSubType("java.math.")
                .allowIfSubType("java.time.")
                .allowIfSubType("java.lang.")
                .build();

        ObjectMapper mapper = JsonMapper.builder()
                .addModule(new JavaTimeModule())
                .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS)
                .disable(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES)
                .build();
        mapper.activateDefaultTyping(typeValidator, ObjectMapper.DefaultTyping.NON_FINAL, JsonTypeInfo.As.PROPERTY);
        return mapper;
    }
}
