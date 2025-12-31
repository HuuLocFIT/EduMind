package com.edumind.lms.modules.payment.mapper;

import com.edumind.lms.modules.payment.dto.response.OrderItemResponse;
import com.edumind.lms.modules.payment.dto.response.OrderResponse;
import com.edumind.lms.modules.payment.dto.response.OrderSummaryResponse;
import com.edumind.lms.modules.payment.entity.Order;
import com.edumind.lms.modules.payment.entity.OrderItem;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.stream.Collectors;

@Component
public class OrderMapper {

    private final TransactionMapper transactionMapper;
    private final InvoiceMapper invoiceMapper;

    public OrderMapper(TransactionMapper transactionMapper, InvoiceMapper invoiceMapper) {
        this.transactionMapper = transactionMapper;
        this.invoiceMapper = invoiceMapper;
    }

    public OrderResponse toResponse(Order order) {
        return OrderResponse.builder()
                .id(order.getId())
                .orderNumber(order.getOrderNumber())
                .userId(order.getUserId())
                .subtotal(order.getSubtotal())
                .discountTotal(order.getDiscountTotal())
                .totalAmount(order.getTotalAmount())
                .currency(order.getCurrency())
                .paymentMethod(order.getPaymentMethod())
                .status(order.getStatus())
                .items(order.getItems().stream()
                        .map(this::toItemResponse)
                        .collect(Collectors.toList()))
                .itemCount(order.getItemCount())
                .latestTransaction(order.getLatestTransaction() != null
                        ? transactionMapper.toResponse(order.getLatestTransaction())
                        : null)
                .invoice(order.getInvoice() != null
                        ? invoiceMapper.toSummaryAsResponse(order.getInvoice())
                        : null)
                .createdAt(order.getCreatedAt())
                .completedAt(order.getCompletedAt())
                .build();
    }

    public OrderSummaryResponse toSummaryResponse(Order order) {
        OrderItem firstItem = order.getItems().isEmpty() ? null : order.getItems().get(0);

        return OrderSummaryResponse.builder()
                .id(order.getId())
                .orderNumber(order.getOrderNumber())
                .status(order.getStatus())
                .totalAmount(order.getTotalAmount())
                .currency(order.getCurrency())
                .paymentMethod(order.getPaymentMethod())
                .itemCount(order.getItemCount())
                .firstCourseTitle(firstItem != null ? firstItem.getCourseTitle() : null)
                .firstCourseThumbnail(firstItem != null ? firstItem.getCourseThumbnailUrl() : null)
                .createdAt(order.getCreatedAt())
                .completedAt(order.getCompletedAt())
                .build();
    }

    public OrderItemResponse toItemResponse(OrderItem item) {
        return OrderItemResponse.builder()
                .id(item.getId())
                .courseId(item.getCourseId())
                .courseTitle(item.getCourseTitle())
                .courseThumbnailUrl(item.getCourseThumbnailUrl())
                .instructorId(item.getInstructorId())
                .instructorName(item.getInstructorName())
                .originalPrice(item.getOriginalPrice())
                .discountAmount(item.getDiscountAmount())
                .finalPrice(item.getFinalPrice())
                .currency(item.getCurrency())
                .createdAt(item.getCreatedAt())
                .build();
    }

    public List<OrderResponse> toResponseList(List<Order> orders) {
        return orders.stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    public List<OrderSummaryResponse> toSummaryResponseList(List<Order> orders) {
        return orders.stream()
                .map(this::toSummaryResponse)
                .collect(Collectors.toList());
    }
}
