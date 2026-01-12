package com.edumind.lms.modules.payment.controller;

import com.edumind.common.response.PagedResponse;
import com.edumind.lms.config.security.JwtTokenProvider;
import com.edumind.lms.config.security.TeacherSecurity;
import com.edumind.lms.modules.payment.dto.response.OrderCountResponse;
import com.edumind.lms.modules.payment.dto.response.OrderResponse;
import com.edumind.lms.modules.payment.dto.response.OrderSummaryResponse;
import com.edumind.lms.modules.payment.enums.OrderStatus;
import com.edumind.lms.modules.payment.service.OrderService;
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
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.util.Collections;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = OrderController.class, excludeAutoConfiguration = {
        SecurityAutoConfiguration.class,
        SecurityFilterAutoConfiguration.class,
        OAuth2ClientAutoConfiguration.class,
        OAuth2ResourceServerAutoConfiguration.class
})
@AutoConfigureMockMvc(addFilters = false)
@DisplayName("OrderController Unit Tests")
class OrderControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private OrderService orderService;

    @MockBean(name = "teacherSecurity")
    private TeacherSecurity teacherSecurity;

    @MockBean(name = "jwtTokenProvider")
    private JwtTokenProvider jwtTokenProvider;

    @Autowired
    private ObjectMapper objectMapper;

    private Long userId = 1L;
    private UsernamePasswordAuthenticationToken auth;
    private OrderResponse orderResponse;
    private OrderSummaryResponse orderSummaryResponse;

    @BeforeEach
    void setUp() {
        auth = new UsernamePasswordAuthenticationToken(userId.toString(), null, Collections.emptyList());
        SecurityContextHolder.getContext().setAuthentication(auth);

        orderResponse = OrderResponse.builder()
                .id(100L)
                .orderNumber("ORD-123")
                .status(OrderStatus.COMPLETED)
                .totalAmount(new BigDecimal("99.99"))
                .userId(userId)
                .build();

        orderSummaryResponse = OrderSummaryResponse.builder()
                .id(100L)
                .orderNumber("ORD-123")
                .status(OrderStatus.COMPLETED)
                .totalAmount(new BigDecimal("99.99"))
                .build();
    }

    @Test
    @DisplayName("GET /orders - Get my orders success")
    void getMyOrders_Success() throws Exception {
        Page<OrderSummaryResponse> page = new PageImpl<>(List.of(orderSummaryResponse));
        when(orderService.getOrdersByUser(eq(userId), any(Pageable.class))).thenReturn(page);

        mockMvc.perform(get("/orders")
                .principal(auth))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].orderNumber").value("ORD-123"));

        verify(orderService).getOrdersByUser(eq(userId), any(Pageable.class));
    }

    @Test
    @DisplayName("GET /orders/{id} - Get order by ID success")
    void getOrderById_Success() throws Exception {
        when(orderService.getOrderByIdAndUser(100L, userId)).thenReturn(orderResponse);

        mockMvc.perform(get("/orders/{id}", 100L)
                .principal(auth))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.orderNumber").value("ORD-123"));

        verify(orderService).getOrderByIdAndUser(100L, userId);
    }

    @Test
    @DisplayName("GET /orders/number/{orderNumber} - Get order by number success")
    void getOrderByNumber_Success() throws Exception {
        when(orderService.getOrderByNumberAndUser("ORD-123", userId)).thenReturn(orderResponse);

        mockMvc.perform(get("/orders/number/{orderNumber}", "ORD-123")
                .principal(auth))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.id").value(100));

        verify(orderService).getOrderByNumberAndUser("ORD-123", userId);
    }

    @Test
    @DisplayName("POST /orders/{id}/cancel - Cancel order success")
    void cancelOrder_Success() throws Exception {
        when(orderService.cancelOrder(100L, userId)).thenReturn(orderResponse);

        mockMvc.perform(post("/orders/{id}/cancel", 100L)
                .principal(auth))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.status").value("COMPLETED")); // Mock returned COMPLETED for simplicity but logical flow verified

        verify(orderService).cancelOrder(100L, userId);
    }

    @Test
    @DisplayName("POST /orders/{id}/refund - Request refund success")
    void requestRefund_Success() throws Exception {
        when(orderService.requestRefund(100L, userId, "reason")).thenReturn(orderResponse);

        mockMvc.perform(post("/orders/{id}/refund", 100L)
                .param("reason", "reason")
                .principal(auth))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        verify(orderService).requestRefund(100L, userId, "reason");
    }

    @Test
    @DisplayName("GET /orders/count - Get order counts success")
    void getOrderCounts_Success() throws Exception {
        OrderCountResponse counts = OrderCountResponse.builder()
                .total(5)
                .completed(3)
                .pending(1)
                .cancelled(1)
                .refunded(0)
                .build();
        
        when(orderService.getOrderCountsByUser(userId)).thenReturn(counts);

        mockMvc.perform(get("/orders/count")
                .principal(auth))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.total").value(5));

        verify(orderService).getOrderCountsByUser(userId);
    }
}
