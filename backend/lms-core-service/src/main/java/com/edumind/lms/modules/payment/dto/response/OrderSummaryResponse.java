package com.edumind.lms.modules.payment.dto.response;

import com.edumind.lms.modules.payment.enums.OrderStatus;
import com.edumind.lms.modules.payment.enums.PaymentMethod;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OrderSummaryResponse {

    private Long id;
    private String orderNumber;
    private OrderStatus status;
    private BigDecimal totalAmount;
    private String currency;
    private PaymentMethod paymentMethod;
    private int itemCount;
    private String firstCourseTitle;       // For display in list
    private String firstCourseThumbnail;
    private LocalDateTime createdAt;
    private LocalDateTime completedAt;
}