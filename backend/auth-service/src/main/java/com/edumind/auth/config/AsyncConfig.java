package com.edumind.auth.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.util.concurrent.Executor;
import java.util.concurrent.ThreadPoolExecutor;

@Configuration
@EnableAsync
public class AsyncConfig {
    private static final Logger log = LoggerFactory.getLogger(AsyncConfig.class);

    @Bean("emailExecutor")
    public Executor emailExecutor(
            @Value("${app.async.email.core-pool-size:2}") int corePoolSize,
            @Value("${app.async.email.max-pool-size:4}") int maxPoolSize,
            @Value("${app.async.email.queue-capacity:100}") int queueCapacity) {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(corePoolSize);
        executor.setMaxPoolSize(maxPoolSize);
        executor.setQueueCapacity(queueCapacity);
        executor.setThreadNamePrefix("auth-email-");
        executor.setWaitForTasksToCompleteOnShutdown(true);
        executor.setAwaitTerminationSeconds(20);
        executor.setRejectedExecutionHandler((task, pool) -> {
            log.error("Email task rejected because the bounded executor queue is full");
            new ThreadPoolExecutor.AbortPolicy().rejectedExecution(task, pool);
        });
        executor.initialize();
        return executor;
    }
}
