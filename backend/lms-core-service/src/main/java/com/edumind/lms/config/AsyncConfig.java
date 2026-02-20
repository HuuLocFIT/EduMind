package com.edumind.lms.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.aop.interceptor.AsyncUncaughtExceptionHandler;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.AsyncConfigurer;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.util.concurrent.Executor;
import java.util.concurrent.RejectedExecutionHandler;
import java.util.concurrent.ThreadPoolExecutor;

@Slf4j
@Configuration
@EnableAsync
public class AsyncConfig implements AsyncConfigurer {

    @Value("${app.async.core-pool-size:10}")
    private int corePoolSize;

    @Value("${app.async.max-pool-size:20}")
    private int maxPoolSize;

    @Value("${app.async.queue-capacity:50}")
    private int queueCapacity;

    /**
     * Executor for @Async methods
     */
    @Override
    @Bean(name = "taskExecutor")
    public Executor getAsyncExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(corePoolSize);
        executor.setMaxPoolSize(maxPoolSize);
        executor.setQueueCapacity(queueCapacity);
        executor.setThreadNamePrefix("lms-async-");
        // Log and discard tasks when the queue is full so rejection is visible in logs
        // rather than causing an unexpected RejectedExecutionException in the caller.
        executor.setRejectedExecutionHandler(loggingRejectedExecutionHandler());
        executor.initialize();
        return executor;
    }

    private RejectedExecutionHandler loggingRejectedExecutionHandler() {
        return (runnable, executor) -> {
            log.error("Async task rejected – thread pool is saturated (active={}, queue={}). "
                            + "Task {} was discarded.",
                    executor.getActiveCount(),
                    executor.getQueue().size(),
                    runnable.getClass().getSimpleName());
            // Fall back to caller-runs policy so critical tasks aren't silently dropped
            new ThreadPoolExecutor.CallerRunsPolicy().rejectedExecution(runnable, executor);
        };
    }

    /**
     * Exception handler for @Async methods that throw uncaught exceptions.
     */
    @Override
    public AsyncUncaughtExceptionHandler getAsyncUncaughtExceptionHandler() {
        return (ex, method, params) ->
                log.error("Async method {}.{}() threw uncaught exception: {}",
                        method.getDeclaringClass().getSimpleName(), method.getName(), ex.getMessage(), ex);
    }
}