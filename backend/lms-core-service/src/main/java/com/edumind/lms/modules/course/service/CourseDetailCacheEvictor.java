package com.edumind.lms.modules.course.service;

import com.edumind.lms.config.CacheConfig;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

/**
 * Removes entries from the course detail cache.
 *
 * <p>Most writes are covered by {@code CourseCacheEvictionListener}, which reacts to domain events.
 * Write paths that publish no event call {@link #evictAfterCommit(Long)} directly.
 *
 * <p>Failures are logged and swallowed: these calls run after the DB commit, so throwing would
 * turn a successful write into an error response. The cache TTL bounds any staleness.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class CourseDetailCacheEvictor {

    private final CacheManager cacheManager;

    public void evict(Long courseId) {
        if (courseId == null) {
            return;
        }
        Cache cache = cacheManager.getCache(CacheConfig.COURSE_DETAIL);
        if (cache == null) {
            return;
        }
        try {
            cache.evict(courseId);
            log.debug("Evicted course detail cache for course {}", courseId);
        } catch (RuntimeException e) {
            log.warn("Failed to evict course detail cache for course {}: {}", courseId, e.getMessage());
        }
    }

    /**
     * Evict once the current transaction commits, so a concurrent reader cannot re-cache the
     * old row between the eviction and the commit. Evicts immediately when no transaction is active.
     */
    public void evictAfterCommit(Long courseId) {
        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            evict(courseId);
            return;
        }
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                evict(courseId);
            }
        });
    }

    /** Used when a change touches many courses at once (e.g. a category rename). */
    public void evictAll() {
        Cache cache = cacheManager.getCache(CacheConfig.COURSE_DETAIL);
        if (cache == null) {
            return;
        }
        try {
            cache.clear();
            log.debug("Cleared course detail cache");
        } catch (RuntimeException e) {
            log.warn("Failed to clear course detail cache: {}", e.getMessage());
        }
    }
}
