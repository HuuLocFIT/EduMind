package com.edumind.lms.modules.payment.controller;

import com.edumind.lms.modules.payment.dto.request.AddToCartRequest;
import com.edumind.lms.modules.payment.dto.response.CartItemResponse;
import com.edumind.lms.modules.payment.dto.response.CartResponse;
import com.edumind.lms.modules.payment.service.CartService;
import com.edumind.lms.config.security.TeacherSecurity;
import com.edumind.lms.config.security.JwtTokenProvider;
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
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.springframework.test.web.servlet.result.MockMvcResultHandlers.print;

@WebMvcTest(controllers = CartController.class, excludeAutoConfiguration = {
        SecurityAutoConfiguration.class,
        SecurityFilterAutoConfiguration.class,
        OAuth2ClientAutoConfiguration.class,
        OAuth2ResourceServerAutoConfiguration.class
})
@AutoConfigureMockMvc(addFilters = false) // Disable security filters
@DisplayName("CartController Unit Tests")
class CartControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private CartService cartService;

    @MockBean(name = "teacherSecurity")
    private TeacherSecurity teacherSecurity;

    @MockBean(name = "jwtTokenProvider")
    private JwtTokenProvider jwtTokenProvider;

    @Autowired
    private ObjectMapper objectMapper;

    private Long userId = 1L;
    private CartResponse cartResponse;
    private UsernamePasswordAuthenticationToken auth;

    @BeforeEach
    void setUp() {
        // Setup mock authentication
        auth = new UsernamePasswordAuthenticationToken(userId.toString(), null, Collections.emptyList());
        SecurityContextHolder.getContext().setAuthentication(auth);

        // Setup common response
        CartItemResponse item = CartItemResponse.builder()
                .id(10L)
                .courseId(100L)
                .courseTitle("Test Course")
                .effectivePrice(new BigDecimal("99.99"))
                .build();

        cartResponse = CartResponse.builder()
                .id(1L)
                .items(List.of(item))
                .totalAmount(new BigDecimal("99.99"))
                .itemCount(1)
                .build();
    }

    @Test
    @DisplayName("POST /cart/items - Add to cart success")
    void addToCart_Success() throws Exception {
        AddToCartRequest request = new AddToCartRequest();
        request.setCourseId(100L);

        when(cartService.addToCart(eq(userId), any(AddToCartRequest.class))).thenReturn(cartResponse);

        mockMvc.perform(post("/cart/items")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request))
                .principal(auth)) // Mock principal
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.items[0].courseId").value(100))
                .andExpect(jsonPath("$.data.totalAmount").value(99.99));
        
        verify(cartService).addToCart(eq(userId), any(AddToCartRequest.class));
    }

    @Test
    @DisplayName("GET /cart - Get cart success")
    void getCart_Success() throws Exception {
        when(cartService.getCart(userId)).thenReturn(cartResponse);

        mockMvc.perform(get("/cart")
                .principal(auth))
                .andDo(print())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.id").value(1));

        verify(cartService).getCart(userId);
    }

    @Test
    @DisplayName("GET /cart - Empty cart returns empty items")
    void getCart_EmptyCart_ReturnsEmptyResponse() throws Exception {
        CartResponse emptyCart = CartResponse.builder()
                .id(1L)
                .items(Collections.emptyList())
                .totalAmount(BigDecimal.ZERO)
                .itemCount(0)
                .build();

        when(cartService.getCart(userId)).thenReturn(emptyCart);

        mockMvc.perform(get("/cart")
                .principal(auth))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.itemCount").value(0))
                .andExpect(jsonPath("$.data.items").isEmpty());

        verify(cartService).getCart(userId);
    }

    @Test
    @DisplayName("DELETE /cart/items/{courseId} - Remove item success")
    void removeFromCart_Success() throws Exception {
        when(cartService.removeFromCart(userId, 100L)).thenReturn(cartResponse);

        mockMvc.perform(delete("/cart/items/{courseId}", 100L)
                .principal(auth))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        verify(cartService).removeFromCart(userId, 100L);
    }

    @Test
    @DisplayName("DELETE /cart - Clear cart success")
    void clearCart_Success() throws Exception {
        doNothing().when(cartService).clearCart(userId);

        mockMvc.perform(delete("/cart")
                .principal(auth))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        verify(cartService).clearCart(userId);
    }

    @Test
    @DisplayName("GET /cart/count - Get count success")
    void getCartItemCount_Success() throws Exception {
        when(cartService.getCartItemCount(userId)).thenReturn(5);

        mockMvc.perform(get("/cart/count")
                .principal(auth))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").value(5));

        verify(cartService).getCartItemCount(userId);
    }

    @Test
    @DisplayName("GET /cart/count - Empty cart returns zero")
    void getCartItemCount_EmptyCart_ReturnsZero() throws Exception {
        when(cartService.getCartItemCount(userId)).thenReturn(0);

        mockMvc.perform(get("/cart/count")
                .principal(auth))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").value(0));

        verify(cartService).getCartItemCount(userId);
    }

    @Test
    @DisplayName("GET /cart/check/{courseId} - Check in cart success")
    void isInCart_Success() throws Exception {
        when(cartService.isInCart(userId, 100L)).thenReturn(true);

        mockMvc.perform(get("/cart/check/{courseId}", 100L)
                .principal(auth))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").value(true));

        verify(cartService).isInCart(userId, 100L);
    }

    @Test
    @DisplayName("GET /cart/check/{courseId} - Course not in cart returns false")
    void isInCart_NotInCart_ReturnsFalse() throws Exception {
        when(cartService.isInCart(userId, 100L)).thenReturn(false);

        mockMvc.perform(get("/cart/check/{courseId}", 100L)
                .principal(auth))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").value(false));

        verify(cartService).isInCart(userId, 100L);
    }
}
