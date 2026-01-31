package com.edumind.lms.modules.payment.config;

import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.Ordered;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;

import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Rate limiter for webhook endpoints to prevent DDoS and brute-force attacks.
 *
 * Uses a sliding window algorithm with configurable limits per IP address.
 * Default: 60 requests per minute per IP for webhook endpoints.
 */
@Slf4j
@Configuration
public class WebhookRateLimiter {

    @Value("${payment.webhook.rate-limit.requests-per-minute:60}")
    private int requestsPerMinute;

    @Value("${payment.webhook.rate-limit.enabled:true}")
    private boolean rateLimitEnabled;

    @Bean
    public FilterRegistrationBean<WebhookRateLimitFilter> webhookRateLimitFilter() {
        FilterRegistrationBean<WebhookRateLimitFilter> registrationBean = new FilterRegistrationBean<>();
        registrationBean.setFilter(new WebhookRateLimitFilter(requestsPerMinute, rateLimitEnabled));
        registrationBean.addUrlPatterns("/payments/webhook/*");
        registrationBean.setOrder(Ordered.HIGHEST_PRECEDENCE);
        registrationBean.setName("webhookRateLimitFilter");
        return registrationBean;
    }

    /**
     * Servlet filter that implements IP-based rate limiting for webhook endpoints.
     */
    public static class WebhookRateLimitFilter implements Filter {

        private final int maxRequestsPerMinute;
        private final boolean enabled;
        private final Map<String, RateLimitBucket> buckets = new ConcurrentHashMap<>();
        private final ScheduledExecutorService cleanupScheduler = Executors.newSingleThreadScheduledExecutor();

        public WebhookRateLimitFilter(int maxRequestsPerMinute, boolean enabled) {
            this.maxRequestsPerMinute = maxRequestsPerMinute;
            this.enabled = enabled;
        }

        @Override
        public void init(FilterConfig filterConfig) {
            // Schedule cleanup of stale buckets every 5 minutes
            cleanupScheduler.scheduleAtFixedRate(this::cleanupStaleBuckets, 5, 5, TimeUnit.MINUTES);
            log.info("[WebhookRateLimiter] Initialized with limit: {} requests/minute, enabled: {}",
                    maxRequestsPerMinute, enabled);
        }

        @Override
        public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
                throws IOException, ServletException {

            if (!enabled) {
                chain.doFilter(request, response);
                return;
            }

            HttpServletRequest httpRequest = (HttpServletRequest) request;
            HttpServletResponse httpResponse = (HttpServletResponse) response;

            String clientIp = getClientIp(httpRequest);
            String path = httpRequest.getRequestURI();

            // Skip rate limiting for health check endpoint
            if (path.endsWith("/health")) {
                chain.doFilter(request, response);
                return;
            }

            RateLimitBucket bucket = buckets.computeIfAbsent(clientIp, k -> new RateLimitBucket());

            if (!bucket.tryAcquire(maxRequestsPerMinute)) {
                log.warn("[WebhookRateLimiter] Rate limit exceeded for IP: {} on path: {}", clientIp, path);

                httpResponse.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
                httpResponse.setContentType(MediaType.APPLICATION_JSON_VALUE);
                httpResponse.getWriter().write(
                        "{\"success\":false,\"error\":\"Rate limit exceeded. Please try again later.\"}");
                return;
            }

            chain.doFilter(request, response);
        }

        @Override
        public void destroy() {
            cleanupScheduler.shutdown();
            try {
                if (!cleanupScheduler.awaitTermination(5, TimeUnit.SECONDS)) {
                    cleanupScheduler.shutdownNow();
                }
            } catch (InterruptedException e) {
                cleanupScheduler.shutdownNow();
                Thread.currentThread().interrupt();
            }
        }

        /**
         * Get client IP address, considering X-Forwarded-For header for proxied requests.
         */
        private String getClientIp(HttpServletRequest request) {
            String xForwardedFor = request.getHeader("X-Forwarded-For");
            if (xForwardedFor != null && !xForwardedFor.isEmpty()) {
                // Take the first IP in the chain (original client)
                return xForwardedFor.split(",")[0].trim();
            }
            String xRealIp = request.getHeader("X-Real-IP");
            if (xRealIp != null && !xRealIp.isEmpty()) {
                return xRealIp;
            }
            return request.getRemoteAddr();
        }

        /**
         * Remove stale buckets that haven't been used in the last 10 minutes.
         */
        private void cleanupStaleBuckets() {
            long staleThreshold = System.currentTimeMillis() - TimeUnit.MINUTES.toMillis(10);
            int removed = 0;

            var iterator = buckets.entrySet().iterator();
            while (iterator.hasNext()) {
                var entry = iterator.next();
                if (entry.getValue().getLastAccessTime() < staleThreshold) {
                    iterator.remove();
                    removed++;
                }
            }

            if (removed > 0) {
                log.debug("[WebhookRateLimiter] Cleaned up {} stale rate limit buckets", removed);
            }
        }
    }

    /**
     * Rate limit bucket using sliding window counter algorithm.
     */
    private static class RateLimitBucket {
        private final AtomicInteger requestCount = new AtomicInteger(0);
        private volatile long windowStart = System.currentTimeMillis();
        private volatile long lastAccessTime = System.currentTimeMillis();

        /**
         * Try to acquire a permit. Returns true if request is allowed, false if rate limited.
         */
        public synchronized boolean tryAcquire(int maxRequests) {
            long now = System.currentTimeMillis();
            lastAccessTime = now;

            // Reset window if minute has passed
            if (now - windowStart >= 60_000) {
                windowStart = now;
                requestCount.set(0);
            }

            // Check if under limit
            if (requestCount.get() >= maxRequests) {
                return false;
            }

            requestCount.incrementAndGet();
            return true;
        }

        public long getLastAccessTime() {
            return lastAccessTime;
        }
    }
}
