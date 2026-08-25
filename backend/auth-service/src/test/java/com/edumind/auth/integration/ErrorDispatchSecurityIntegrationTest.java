package com.edumind.auth.integration;

import com.edumind.auth.config.BaseIntegrationTest;
import jakarta.servlet.DispatcherType;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MvcResult;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;

/**
 * Integration tests for how the security filter chain treats the container's internal
 * ERROR dispatch.
 *
 * <p>Background: since Spring Security 6, {@code AuthorizationFilter} runs on ERROR and
 * ASYNC dispatches too. When something throws inside a filter (outside the
 * DispatcherServlet, so {@code GlobalExceptionHandler} cannot see it), the container
 * forwards to {@code /error} - and that forward gets authorized a second time. With
 * {@code .anyRequest().authenticated()} in place, the real 500 is masked as a
 * misleading {@code 401 ERR_2005 "Authentication token is required"}.
 *
 * <p>The rule under test permits the ERROR <i>dispatch type</i>, not the {@code /error}
 * <i>path</i>: the original request was already authorized on its REQUEST dispatch, so
 * re-authorizing the internal forward is wrong. An externally issued request always
 * arrives as a REQUEST dispatch and therefore stays protected.
 */
class ErrorDispatchSecurityIntegrationTest extends BaseIntegrationTest {

    @Test
    @DisplayName("Internal ERROR dispatch should not be masked as 401 ERR_2005")
    void errorDispatchShouldNotBeMaskedAsUnauthorized() throws Exception {
        MvcResult result = mockMvc.perform(get("/error")
                        .with(request -> {
                            request.setDispatcherType(DispatcherType.ERROR);
                            return request;
                        }))
                .andReturn();

        assertNotEquals(401, result.getResponse().getStatus(),
                "the internal error forward must not be re-authorized - it hides the real failure");
        assertFalse(result.getResponse().getContentAsString().contains("ERR_2005"),
                "the real error must not be replaced by a missing-token response");
    }

    @Test
    @DisplayName("Internal ASYNC dispatch should not be masked as 401 ERR_2005")
    void asyncDispatchShouldNotBeMaskedAsUnauthorized() throws Exception {
        // A path that requires authentication on its REQUEST dispatch, so this proves the
        // ASYNC rule is doing the work rather than the path already being permitAll.
        MvcResult result = mockMvc.perform(get("/upload/avatar")
                        .with(request -> {
                            request.setDispatcherType(DispatcherType.ASYNC);
                            return request;
                        }))
                .andReturn();

        assertNotEquals(401, result.getResponse().getStatus(),
                "re-dispatching an already-authorized async request must not require credentials again");
    }

    @Test
    @DisplayName("An external request to /error must still require authentication")
    void externalRequestToErrorPathIsStillProtected() throws Exception {
        // This is what distinguishes dispatcherTypeMatchers(ERROR) from
        // requestMatchers("/error"): the latter would open this up as well.
        MvcResult result = mockMvc.perform(get("/error")).andReturn();

        assertEquals(401, result.getResponse().getStatus(),
                "/error must not become a publicly reachable endpoint");
    }
}
