package com.edumind.lms.modules.payment.mapper;

import com.edumind.lms.modules.payment.dto.response.CartItemResponse;
import com.edumind.lms.modules.payment.dto.response.CartResponse;
import com.edumind.lms.modules.payment.entity.Cart;
import com.edumind.lms.modules.payment.entity.CartItem;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.List;

@Component
public class CartMapper {

    public CartResponse toResponse(Cart cart, List<CartItemResponse> itemResponses) {
        BigDecimal subtotal = itemResponses.stream()
                .map(CartItemResponse::getOriginalPrice)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal discountTotal = itemResponses.stream()
                .map(item -> item.getOriginalPrice().subtract(item.getEffectivePrice()))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalAmount = itemResponses.stream()
                .map(CartItemResponse::getEffectivePrice)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return CartResponse.builder()
                .id(cart.getId())
                .userId(cart.getUserId())
                .items(itemResponses)
                .itemCount(itemResponses.size())
                .subtotal(subtotal)
                .discountTotal(discountTotal)
                .totalAmount(totalAmount)
                .currency("USD")
                .createdAt(cart.getCreatedAt())
                .updatedAt(cart.getUpdatedAt())
                .build();
    }

    // Note: CartItemResponse needs course data, so conversion happens in service
    public CartItemResponse toItemResponse(CartItem item) {
        return CartItemResponse.builder()
                .id(item.getId())
                .courseId(item.getCourseId())
                .originalPrice(item.getPriceSnapshot())
                .effectivePrice(item.getPriceSnapshot())
                .currency(item.getCurrency())
                .addedAt(item.getAddedAt())
                .build();
    }
}
