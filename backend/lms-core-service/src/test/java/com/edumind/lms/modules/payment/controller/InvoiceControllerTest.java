package com.edumind.lms.modules.payment.controller;

import com.edumind.lms.config.security.JwtTokenProvider;
import com.edumind.lms.config.security.TeacherSecurity;
import com.edumind.lms.modules.payment.dto.response.InvoiceResponse;
import com.edumind.lms.modules.payment.service.InvoiceService;
import com.edumind.lms.shared.exception.ResourceNotFoundException;
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
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(controllers = InvoiceController.class, excludeAutoConfiguration = {
        SecurityAutoConfiguration.class,
        SecurityFilterAutoConfiguration.class,
        OAuth2ClientAutoConfiguration.class,
        OAuth2ResourceServerAutoConfiguration.class
})
@AutoConfigureMockMvc(addFilters = false)
@DisplayName("InvoiceController Unit Tests")
class InvoiceControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private InvoiceService invoiceService;

    @MockBean(name = "teacherSecurity")
    private TeacherSecurity teacherSecurity;

    @MockBean(name = "jwtTokenProvider")
    private JwtTokenProvider jwtTokenProvider;

    @Autowired
    private ObjectMapper objectMapper;

    private Long userId = 1L;
    private UsernamePasswordAuthenticationToken auth;
    private InvoiceResponse invoiceResponse;

    @BeforeEach
    void setUp() {
        auth = new UsernamePasswordAuthenticationToken(userId.toString(), null, Collections.emptyList());
        SecurityContextHolder.getContext().setAuthentication(auth);

        invoiceResponse = InvoiceResponse.builder()
                .id(1L)
                .invoiceNumber("INV-123")
                .totalAmount(new BigDecimal("99.99"))
                .buyerId(userId)
                .issuedAt(LocalDateTime.now())
                .build();
    }

    @Test
    @DisplayName("GET /invoices - Get my invoices success")
    void getMyInvoices_Success() throws Exception {
        Page<InvoiceResponse> page = new PageImpl<>(List.of(invoiceResponse));
        when(invoiceService.getUserInvoices(eq(userId), any(Pageable.class))).thenReturn(page);

        mockMvc.perform(get("/invoices")
                .principal(auth))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].invoiceNumber").value("INV-123"));

        verify(invoiceService).getUserInvoices(eq(userId), any(Pageable.class));
    }

    @Test
    @DisplayName("GET /invoices/{id} - Get invoice by ID success")
    void getInvoiceById_Success() throws Exception {
        when(invoiceService.getInvoiceByIdAndUser(1L, userId)).thenReturn(invoiceResponse);

        mockMvc.perform(get("/invoices/{id}", 1L)
                .principal(auth))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.invoiceNumber").value("INV-123"));

        verify(invoiceService).getInvoiceByIdAndUser(1L, userId);
    }

    @Test
    @DisplayName("GET /invoices/number/{invoiceNumber} - Get invoice by number success")
    void getInvoiceByNumber_Success() throws Exception {
        when(invoiceService.getInvoiceByNumberAndUser("INV-123", userId)).thenReturn(invoiceResponse);

        mockMvc.perform(get("/invoices/number/{invoiceNumber}", "INV-123")
                .principal(auth))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.id").value(1));

        verify(invoiceService).getInvoiceByNumberAndUser("INV-123", userId);
    }

    @Test
    @DisplayName("GET /invoices/order/{orderId} - Get invoice by order ID success")
    void getInvoiceByOrderId_Success() throws Exception {
        when(invoiceService.getInvoiceByOrderIdAndUser(100L, userId)).thenReturn(invoiceResponse);

        mockMvc.perform(get("/invoices/order/{orderId}", 100L)
                .principal(auth))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.id").value(1));

        verify(invoiceService).getInvoiceByOrderIdAndUser(100L, userId);
    }

    @Test
    @DisplayName("GET /invoices/{id}/download - Download PDF success")
    void downloadInvoicePdf_Success() throws Exception {
        byte[] pdfContent = "Dummy PDF Content".getBytes();
        when(invoiceService.getInvoiceByIdAndUser(1L, userId)).thenReturn(invoiceResponse);
        when(invoiceService.generateInvoicePdfBytes(1L)).thenReturn(pdfContent);

        mockMvc.perform(get("/invoices/{id}/download", 1L)
                .principal(auth))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"INV-123.pdf\""))
                .andExpect(content().contentType(MediaType.APPLICATION_PDF))
                .andExpect(content().bytes(pdfContent));

        verify(invoiceService).getInvoiceByIdAndUser(1L, userId);
        verify(invoiceService).generateInvoicePdfBytes(1L);
    }

    @Test
    @DisplayName("GET /invoices/{id}/view - View PDF success")
    void viewInvoicePdf_Success() throws Exception {
        byte[] pdfContent = "Dummy PDF Content".getBytes();
        when(invoiceService.getInvoiceByIdAndUser(1L, userId)).thenReturn(invoiceResponse);
        when(invoiceService.generateInvoicePdfBytes(1L)).thenReturn(pdfContent);

        mockMvc.perform(get("/invoices/{id}/view", 1L)
                .principal(auth))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"INV-123.pdf\""))
                .andExpect(content().contentType(MediaType.APPLICATION_PDF))
                .andExpect(content().bytes(pdfContent));

        verify(invoiceService).getInvoiceByIdAndUser(1L, userId);
        verify(invoiceService).generateInvoicePdfBytes(1L);
    }

    @Test
    @DisplayName("GET /invoices/{id} - Not found returns 404")
    void getInvoiceById_NotFound_ReturnsNotFound() throws Exception {
        when(invoiceService.getInvoiceByIdAndUser(999L, userId))
                .thenThrow(new ResourceNotFoundException("Invoice not found"));

        mockMvc.perform(get("/invoices/{id}", 999L)
                .principal(auth))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success").value(false));
    }
}
