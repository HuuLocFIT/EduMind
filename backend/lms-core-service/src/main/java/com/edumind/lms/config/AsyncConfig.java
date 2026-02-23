package com.edumind.lms.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.aop.interceptor.AsyncUncaughtExceptionHandler;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.AsyncConfigurer;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.util.concurrent.Executor;
import java.util.concurrent.RejectedExecutionHandler;
import java.util.concurrent.ThreadPoolExecutor;

@Slf4j
@Configuration
@EnableAsync
@EnableScheduling
public class AsyncConfig implements AsyncConfigurer {

    @Value("${app.async.core-pool-size:10}")
    private int corePoolSize;

    @Value("${app.async.max-pool-size:20}")
    private int maxPoolSize;

    @Value("${app.async.queue-capacity:50}")
    private int queueCapacity;

    @Value("${ai.executor.ai-core-pool-size:2}")
    private int aiCorePoolSize;

    @Value("${ai.executor.ai-max-pool-size:5}")
    private int aiMaxPoolSize;

    @Value("${ai.executor.ai-queue-capacity:50}")
    private int aiQueueCapacity;

    @Value("${ai.executor.whisper-queue-capacity:10}")
    private int whisperQueueCapacity;

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
        // CallerRunsPolicy is safe for general short-lived tasks
        executor.setRejectedExecutionHandler(callerRunsWithLoggingHandler());
        executor.initialize();
        return executor;
    }

    /**
     * Executor for AI LLM jobs (Gemini API calls).
     */
    @Bean(name = "aiTaskExecutor")
    public Executor aiTaskExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(aiCorePoolSize);
        executor.setMaxPoolSize(aiMaxPoolSize);
        executor.setQueueCapacity(aiQueueCapacity);
        executor.setThreadNamePrefix("ai-worker-");
        // AbortPolicy: throws RejectedExecutionException → wrapped as TaskRejectedException
        // → GlobalExceptionHandler returns HTTP 429. CallerRunsPolicy would silently run
        // the task on the HTTP thread, blocking it for the entire LLM call duration.
        executor.setRejectedExecutionHandler(loggingAbortHandler());
        executor.initialize();
        return executor;
    }

    /**
     * Executor for Whisper/Groq transcription - size=1 to control rate limit.
     */
    @Bean(name = "whisperTaskExecutor")
    public Executor whisperTaskExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(1);
        executor.setMaxPoolSize(1);
        executor.setQueueCapacity(whisperQueueCapacity);
        executor.setThreadNamePrefix("whisper-worker-");
        // AbortPolicy: throws RejectedExecutionException → TaskRejectedException → HTTP 429
        executor.setRejectedExecutionHandler(loggingAbortHandler());
        executor.initialize();
        return executor;
    }

    /**
     * For general (non-AI) tasks: log the rejection and fall back to CallerRunsPolicy.
     * Safe because general async tasks are short-lived and won't block the HTTP thread.
     */
    private RejectedExecutionHandler callerRunsWithLoggingHandler() {
        return (runnable, executor) -> {
            log.warn("Async task rejected – thread pool is saturated (active={}, queue={}). "
                            + "Falling back to caller thread for task {}.",
                    executor.getActiveCount(),
                    executor.getQueue().size(),
                    runnable.getClass().getSimpleName());
            new ThreadPoolExecutor.CallerRunsPolicy().rejectedExecution(runnable, executor);
        };
    }

    /**
     * For AI/Whisper executors: log the rejection and throw RejectedExecutionException.
     * Spring wraps this as TaskRejectedException, which the GlobalExceptionHandler maps to HTTP 429.
     * CallerRunsPolicy must NOT be used here — it would block the HTTP request thread for the
     * entire LLM/Groq API call duration (seconds to minutes), defeating rate-limit protection.
     */
    private RejectedExecutionHandler loggingAbortHandler() {
        return (runnable, executor) -> {
            log.error("AI task rejected – executor queue is full (active={}, queue={}/{}). "
                            + "Task {} will return HTTP 429 to client.",
                    executor.getActiveCount(),
                    executor.getQueue().size(),
                    executor.getQueue().remainingCapacity() + executor.getQueue().size(),
                    runnable.getClass().getSimpleName());
            new ThreadPoolExecutor.AbortPolicy().rejectedExecution(runnable, executor);
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