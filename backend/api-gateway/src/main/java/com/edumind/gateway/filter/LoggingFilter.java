package com.edumind.gateway.filter;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.http.HttpStatusCode;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

@Component
public class LoggingFilter implements GlobalFilter, Ordered {
    private static final Logger logger = LoggerFactory.getLogger(LoggingFilter.class);

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        String path = exchange.getRequest().getPath().value();
        String method = exchange.getRequest().getMethod().toString();

        logger.info("📥 Incoming Request: {} {}", method, path);

        // doFinally (not then) so the response is logged on error/cancel too, not only on
        // successful completion. Status can still be null if the response was never committed.
        return chain.filter(exchange).doFinally(signal -> {
            HttpStatusCode status = exchange.getResponse().getStatusCode();
            logger.info("📤 Response Status: {} for {} {} ({})",
                    status != null ? status.value() : "unknown", method, path, signal);
        });
    }

    @Override
    public int getOrder() {
        return -1; // Highest priority
    }
}
