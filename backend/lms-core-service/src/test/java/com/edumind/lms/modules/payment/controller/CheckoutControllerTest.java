package com.edumind.lms.modules.payment.controller;

import com.edumind.lms.config.security.JwtTokenProvider;
import com.edumind.lms.config.security.TeacherSecurity;
import com.edumind.lms.modules.payment.dto.request.CheckoutRequest;
import com.edumind.lms.modules.payment.dto.request.DirectCheckoutRequest;
import com.edumind.lms.modules.payment.dto.response.CheckoutPreviewResponse;
import com.edumind.lms.modules.payment.dto.response.CheckoutResultResponse;
import com.edumind.lms.modules.payment.enums.PaymentMethod;
import com.edumind.lms.modules.payment.service.CheckoutService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.security.oauth2.client.servlet.OAuth2ClientAutoConfiguration;
import org.springframework.boot.autoconfigure.security.oauth2.resource.servlet.OAuth2ResourceServerAutoConfiguration;
import org.springframework.boot.autoconfigure.security.servlet.SecurityAutoConfiguration;
import org.springframework.boot.autoconfigure.security.servlet.SecurityFilterAutoConfiguration;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.util.Collections;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = CheckoutController.class, excludeAutoConfiguration = {
        SecurityAutoConfiguration.class,
        SecurityFilterAutoConfiguration.class,
        OAuth2ClientAutoConfiguration.class,
        OAuth2ResourceServerAutoConfiguration.class
})
@AutoConfigureMockMvc(addFilters = false)
@DisplayName("CheckoutController Unit Tests")
class CheckoutControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private CheckoutService checkoutService;

    @MockBean(name = "teacherSecurity")
    private TeacherSecurity teacherSecurity;

    @MockBean(name = "jwtTokenProvider")
    private JwtTokenProvider jwtTokenProvider;

    @Autowired
    private ObjectMapper objectMapper;

    private Long userId = 1L;
    private UsernamePasswordAuthenticationToken auth;
    private CheckoutPreviewResponse previewResponse;
    private CheckoutResultResponse resultResponse;

    @BeforeEach
    void setUp() {
        auth = new UsernamePasswordAuthenticationToken(userId.toString(), null, Collections.emptyList());
        SecurityContextHolder.getContext().setAuthentication(auth);

        previewResponse = CheckoutPreviewResponse.builder()
                .subtotal(new BigDecimal("99.99"))
                .totalAmount(new BigDecimal("99.99"))
                .currency("USD")
                .build();

        resultResponse = CheckoutResultResponse.builder()
                .success(true)
                .transactionNumber("txn_123")
                .orderId(100L)
                .build();
    }

    @Test
    @DisplayName("POST /checkout/preview - Preview checkout success")
    void previewCheckout_Success() throws Exception {
        when(checkoutService.previewCheckout(userId)).thenReturn(previewResponse);

        mockMvc.perform(post("/checkout/preview")
                .principal(auth))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.totalAmount").value(99.99));

        verify(checkoutService).previewCheckout(userId);
    }

    @Test
    @DisplayName("POST /checkout - Checkout success")
    void checkout_Success() throws Exception {
        CheckoutRequest request = new CheckoutRequest();
        request.setPaymentMethod(PaymentMethod.MOCK);
        request.setCardNumber("4242424242420000");

        when(checkoutService.checkout(eq(userId), any(CheckoutRequest.class))).thenReturn(resultResponse);

        mockMvc.perform(post("/checkout")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request))
                .principal(auth))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.transactionNumber").value("txn_123"));

        verify(checkoutService).checkout(eq(userId), any(CheckoutRequest.class));
    }

    @Test
    @DisplayName("POST /checkout/direct/preview - Direct checkout preview success")
    void previewDirectCheckout_Success() throws Exception {
        when(checkoutService.previewDirectCheckout(userId, 100L)).thenReturn(previewResponse);

        mockMvc.perform(post("/checkout/direct/preview")
                .param("courseId", "100")
                .principal(auth))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.totalAmount").value(99.99));

        verify(checkoutService).previewDirectCheckout(userId, 100L);
    }

    @Test
    @DisplayName("POST /checkout/direct - Direct checkout success")
    void directCheckout_Success() throws Exception {
        DirectCheckoutRequest request = new DirectCheckoutRequest();
        request.setCourseId(100L);
        request.setPaymentMethod(PaymentMethod.MOCK);
        request.setCardNumber("4242424242420000");

        when(checkoutService.directCheckout(eq(userId), any(DirectCheckoutRequest.class))).thenReturn(resultResponse);

        mockMvc.perform(post("/checkout/direct")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request))
                .principal(auth))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.orderId").value(100));

        verify(checkoutService).directCheckout(eq(userId), any(DirectCheckoutRequest.class));
    }
}
