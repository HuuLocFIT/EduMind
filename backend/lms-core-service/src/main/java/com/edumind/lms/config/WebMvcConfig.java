package com.edumind.lms.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.core.task.AsyncTaskExecutor;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;
import org.springframework.security.concurrent.DelegatingSecurityContextRunnable;
import org.springframework.web.servlet.config.annotation.AsyncSupportConfigurer;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.util.concurrent.Future;

/**
 * Configures Spring MVC async support to propagate the Spring Security context
 * to async/SSE threads (e.g., Flux-returning endpoints like /ai/chat/stream).
 *
 * Without this, the security context (stored in ThreadLocal) is lost when
 * Spring MVC dispatches the Flux subscription to a new thread, causing
 * AuthorizationDeniedException on the async dispatch.
 */
@Configuration
public class WebMvcConfig implements WebMvcConfigurer {

    @Override
    public void configureAsyncSupport(AsyncSupportConfigurer configurer) {
        configurer.setDefaultTimeout(300000L); // 5 minutes timeout for long-running AI streams
        ThreadPoolTaskExecutor delegate = new ThreadPoolTaskExecutor();
        delegate.setCorePoolSize(4);
        delegate.setMaxPoolSize(10);
        delegate.setQueueCapacity(50);
        delegate.setThreadNamePrefix("mvc-async-");
        delegate.initialize();

        configurer.setTaskExecutor(new AsyncTaskExecutor() {
            @Override
            public void execute(Runnable task) {
                delegate.execute(new DelegatingSecurityContextRunnable(task));
            }

            @Override
            @SuppressWarnings("deprecation")
            public void execute(Runnable task, long startTimeout) {
                delegate.execute(new DelegatingSecurityContextRunnable(task), startTimeout);
            }

            @Override
            public Future<?> submit(Runnable task) {
                return delegate.submit(new DelegatingSecurityContextRunnable(task));
            }

            @Override
            public <T> Future<T> submit(java.util.concurrent.Callable<T> task) {
                return delegate.submit(new org.springframework.security.concurrent.DelegatingSecurityContextCallable<>(task));
            }
        });
    }
}
