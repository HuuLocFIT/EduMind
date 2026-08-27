package com.edumind.common.exception;

import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class GlobalExceptionHandlerTest {

    private final GlobalExceptionHandler handler = new GlobalExceptionHandler();

    private Logger logbackLogger;
    private Level originalLevel;
    private ListAppender<ILoggingEvent> appender;

    @BeforeEach
    void setUp() {
        logbackLogger = (Logger) LoggerFactory.getLogger(GlobalExceptionHandler.class);
        originalLevel = logbackLogger.getLevel();
        logbackLogger.setLevel(Level.ALL);
        appender = new ListAppender<>();
        appender.start();
        logbackLogger.addAppender(appender);
    }

    @AfterEach
    void tearDown() {
        logbackLogger.detachAppender(appender);
        logbackLogger.setLevel(originalLevel);
    }

    @Test
    void handleTokenRefreshException_ShouldNotLogAtWarnOrErrorLevel() {
        // A boot probe with no refresh cookie is routine guest traffic, not an
        // operational error - it must not be logged as loudly as one.
        HttpServletRequest request = mock(HttpServletRequest.class);
        when(request.getRequestURI()).thenReturn("/auth/refresh");

        handler.handleTokenRefreshException(
                new TokenRefreshException("Refresh token not found!"), request);

        boolean loggedAtWarnOrAbove = appender.list.stream()
                .anyMatch(event -> event.getLevel().isGreaterOrEqual(Level.WARN));

        assertFalse(loggedAtWarnOrAbove,
                "TokenRefreshException should log below WARN so routine boot-probe traffic doesn't read as an error");
    }
}
