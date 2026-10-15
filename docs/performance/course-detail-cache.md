# Course detail cache (Redis)

`GET /courses/{id}` and `GET /courses/slug/{slug}` in lms-core-service are served through a
read-through Redis cache. This page covers how the cache works and how to measure its effect.

## Design

| Aspect | Choice |
|---|---|
| What is cached | `CourseDetailResponse` (course + category + sections + lesson metadata). It holds no per-user data, so one entry serves every viewer. |
| Key | `lms:courseDetail::<courseId>`. Slug requests resolve the id with an indexed `SELECT c.id ... WHERE slug = ?` and then share the same key, so each course has exactly one key to evict. |
| Which courses | Only `PUBLISHED` (`@Cacheable(unless = ...)`). Drafts are edited often and seen by few people. |
| TTL | 10 min for `courseDetail`, 1 h for `platformConfig`. The TTL is only a safety net; eviction normally happens on write. |
| Invalidation | `CourseCacheEvictionListener` evicts on course, section, lesson, review and enrollment events. It runs `AFTER_COMMIT`, synchronously, so the next request already misses the cache. Writes that publish no event (section/lesson reorder, duration recalculation after video upload/delete, statistics refresh) call `CourseDetailCacheEvictor.evictAfterCommit()` directly. Category changes clear the whole cache with SCAN, not KEYS. |
| Authorization | `ensureCourseVisible` still runs on every request, using `status` and `instructorId` from the cached DTO. |
| Redis outage | `CacheErrorHandler` logs and falls through to the DB. Redis timeouts are 500 ms, and the Redis health indicator is off so the container stays healthy. |
| Transactions | The caching advisor sits just outside the transaction advisor. A hit opens no transaction and borrows no DB connection, and `@CacheEvict` runs after commit. |
| Serialization | JSON (`GenericJackson2JsonRedisSerializer`) on a dedicated `ObjectMapper` with type hints, limited by a `PolymorphicTypeValidator` to `com.edumind.*` and JDK value types. |

Known limitation: a reader that misses the cache, loads the old row, and writes it back *after*
a concurrent writer's commit and eviction can leave a stale entry. The 10-minute TTL bounds this.

Tests:
- `CourseDetailCacheIntegrationTest` covers hit with zero SQL, evict on update/lesson edit/reorder, drafts not cached, and archived courses returning 404 after being cached.
- `CourseDetailCacheRedisDownTest` covers the DB fallback when Redis is down.
- `RedisCacheSerializationTest` round-trips values through a real Redis.

## How to measure

Prerequisites: Postgres with seed data, Redis, and `ab` (ships with macOS).

1. Start lms-core **without** cache: `CACHE_TYPE=none mvn spring-boot:run`.
2. `backend/scripts/benchmark-course-detail.sh no-cache`
3. Restart lms-core normally (Redis cache on).
4. `backend/scripts/benchmark-course-detail.sh redis`
5. Hit rate (admin JWT required):
   `curl -H "Authorization: Bearer $ADMIN_JWT" 'localhost:8083/actuator/metrics/cache.gets?tag=name:courseDetail&tag=result:hit'`
   and the same with `result:miss`.

The script calls lms-core directly on :8083 because the gateway rate-limits to 10 req/s per IP.
It picks the published course with the most lessons, warms up with 200 requests, then runs
2000 requests at concurrency 20. For a fair comparison, start lms-core in both modes with
`LOGGING_LEVEL_ORG_HIBERNATE_SQL=INFO LOGGING_LEVEL_ORG_HIBERNATE_TYPE_DESCRIPTOR_SQL_BASICBINDER=INFO`,
since `org.hibernate.SQL: DEBUG` in the default profile slows the uncached path.

## Results

Environment: Apple M2 (8 cores), 16 GB RAM, OpenJDK 21. Postgres 16.12 and Redis 7.4.6 in Docker
on the same machine. lms-core run with `mvn spring-boot:run`, SQL logging turned down to INFO
(`LOGGING_LEVEL_ORG_HIBERNATE_SQL=INFO LOGGING_LEVEL_ORG_HIBERNATE_TYPE_DESCRIPTOR_SQL_BASICBINDER=INFO`)
for both runs.
Course: `deep-dive-dom-browser-apis` (10 sections, 41 lessons).
Load: 200 warm-up requests, then 2000 requests at concurrency 20; 0 failed, 0 non-2xx in both runs.

| Mode | RPS | p50 (ms) | p95 (ms) | p99 (ms) |
|---|---|---|---|---|
| no-cache | 492.77 | 35 | 85 | 119 |
| redis | 1077.72 | 15 | 40 | 63 |
| change | 2.2x | −57% | −53% | −47% |

Hit rate during the redis run was not read from actuator. The run targets a single key after
warm-up, so effectively every measured request is a hit; this measures the hit path, not a
realistic mix of hits and misses.

With the default profile's SQL logging left on (`org.hibernate.SQL: DEBUG`, binder `TRACE`), the
uncached path was slower (385 RPS, p95 116 ms) and the gap looked wider (3x RPS). Those numbers
are not used above because logging cost, not the database, made up part of the difference.
