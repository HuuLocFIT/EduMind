package com.edumind.lms.modules.payment.controller;

import com.edumind.lms.modules.payment.dto.request.WebhookPayloadRequest;
import com.edumind.lms.modules.payment.enums.PaymentMethod;
import com.edumind.lms.modules.payment.service.WebhookService;
import com.edumind.lms.modules.payment.service.PayoutService;
import com.fasterxml.jackson.databind.ObjectMapper;
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
import org.springframework.test.web.servlet.MockMvc;

import java.util.Map;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = WebhookController.class, excludeAutoConfiguration = {
        SecurityAutoConfiguration.class,
        SecurityFilterAutoConfiguration.class,
        OAuth2ClientAutoConfiguration.class,
        OAuth2ResourceServerAutoConfiguration.class
})
@AutoConfigureMockMvc(addFilters = false)
@DisplayName("WebhookController Unit Tests")
class WebhookControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private WebhookService webhookService;

    @MockBean
    private PayoutService payoutService;

    @MockBean(name = "teacherSecurity")
    private com.edumind.lms.config.security.TeacherSecurity teacherSecurity;

    @MockBean(name = "jwtTokenProvider")
    private com.edumind.lms.config.security.JwtTokenProvider jwtTokenProvider;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    @DisplayName("GET /payments/webhook/health - Check health success")
    void healthCheck_Success() throws Exception {
        mockMvc.perform(get("/payments/webhook/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("healthy"));
    }

    @Test
    @DisplayName("POST /payments/webhook/mock - Handle mock webhook success")
    void handleMockWebhook_Success() throws Exception {
        WebhookPayloadRequest request = new WebhookPayloadRequest();
        request.setOrderNumber("ORD-123");
        request.setStatus("COMPLETED");

        mockMvc.perform(post("/payments/webhook/mock")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        verify(webhookService).handleWebhook(eq(PaymentMethod.MOCK), any(WebhookPayloadRequest.class));
    }

    @Test
    @DisplayName("POST /payments/webhook/paypal - Handle PayPal webhook success")
    void handlePayPalWebhook_Success() throws Exception {
        com.edumind.lms.modules.payment.gateway.impl.paypal.PayPalWebhookPayload payload = 
            new com.edumind.lms.modules.payment.gateway.impl.paypal.PayPalWebhookPayload();
        payload.setId("webhook-id-123");
        payload.setEventType("PAYMENT.CAPTURE.COMPLETED");
        
        // Create resource as Map
        Map<String, Object> resourceMap = new java.util.LinkedHashMap<>();
        resourceMap.put("id", "capture-id-123");
        resourceMap.put("custom_id", "ORD-123");
        resourceMap.put("status", "COMPLETED");
        
        // Add amount
        Map<String, Object> amountMap = new java.util.LinkedHashMap<>();
        amountMap.put("value", "100.00");
        amountMap.put("currency_code", "USD");
        resourceMap.put("amount", amountMap);
        
        payload.setRawResource(resourceMap);

        when(webhookService.verifyPayPalSignature(any(), any(), any(), any(), any(), any(), any())).thenReturn(true);

        mockMvc.perform(post("/payments/webhook/paypal")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(payload))
                .header("PAYPAL-TRANSMISSION-ID", "trans-id")
                .header("PAYPAL-TRANSMISSION-TIME", "2023-01-01T00:00:00Z")
                .header("PAYPAL-TRANSMISSION-SIG", "valid-signature")
                .header("PAYPAL-CERT-URL", "https://api.paypal.com/cert")
                .header("PAYPAL-AUTH-ALGO", "SHA256withRSA"))
                .andExpect(status().isOk()); // Returns 200 OK empty body

        verify(webhookService).handleWebhook(eq(PaymentMethod.PAYPAL), any(WebhookPayloadRequest.class));
    }

    @Test
    @DisplayName("POST /payments/webhook/paypal - Invalid signature")
    void handlePayPalWebhook_InvalidSignature() throws Exception {
        WebhookPayloadRequest request = new WebhookPayloadRequest();

        when(webhookService.verifySignature(eq(PaymentMethod.PAYPAL), any(), any())).thenReturn(false);

        mockMvc.perform(post("/payments/webhook/paypal")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request))
                .header("PAYPAL-TRANSMISSION-SIG", "invalid-signature"))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("POST /payments/webhook/sepay - Handle SePay webhook success")
    void handleSepayWebhook_Success() throws Exception {
        com.edumind.lms.modules.payment.gateway.impl.sepay.SepayWebhookPayload payload = 
            new com.edumind.lms.modules.payment.gateway.impl.sepay.SepayWebhookPayload();
        payload.setId(123L);
        payload.setCode("ORD-123");
        payload.setContent("ORD-123 payment");
        payload.setTransferType("in");
        payload.setTransferAmount(100000L);
        payload.setAccountNumber("1234567890");

        when(webhookService.verifySignature(eq(PaymentMethod.SEPAY), any(), any())).thenReturn(true);

        mockMvc.perform(post("/payments/webhook/sepay")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(payload))
                .header("Authorization", "Apikey valid-key"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        verify(webhookService).handleWebhook(eq(PaymentMethod.SEPAY), any(WebhookPayloadRequest.class));
    }
}
