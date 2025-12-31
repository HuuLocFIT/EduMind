package com.edumind.lms.modules.payment.service;

import com.edumind.lms.modules.payment.dto.response.OrderItemResponse;
import com.edumind.lms.modules.payment.dto.response.OrderResponse;
import com.edumind.lms.modules.payment.dto.response.OrderSummaryResponse;
import com.edumind.lms.modules.payment.entity.Order;
import com.edumind.lms.modules.payment.entity.OrderItem;
import com.edumind.lms.modules.payment.enums.OrderStatus;
import com.edumind.lms.modules.payment.exception.InvalidOrderStateException;
import com.edumind.lms.modules.payment.exception.OrderNotFoundException;
import com.edumind.lms.modules.payment.mapper.OrderMapper;
import com.edumind.lms.modules.payment.repository.OrderItemRepository;
import com.edumind.lms.modules.payment.repository.OrderRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class OrderServiceImpl implements OrderService {

    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final OrderMapper orderMapper;

    @Override
    @Transactional(readOnly = true)
    public OrderResponse getOrderById(Long orderId) {
        Order order = getOrderEntity(orderId);
        return buildOrderResponse(order);
    }

    @Override
    @Transactional(readOnly = true)
    public OrderResponse getOrderByNumber(String orderNumber) {
        Order order = orderRepository.findByOrderNumber(orderNumber)
                .orElseThrow(() -> new OrderNotFoundException(orderNumber));
        return buildOrderResponse(order);
    }

    @Override
    @Transactional(readOnly = true)
    public Order getOrderEntity(Long orderId) {
        return orderRepository.findById(orderId)
                .orElseThrow(() -> new OrderNotFoundException(orderId));
    }

    @Override
    @Transactional(readOnly = true)
    public Page<OrderSummaryResponse> getUserOrders(Long userId, Pageable pageable) {
        return orderRepository.findByUserIdOrderByCreatedAtDesc(userId, pageable)
                .map(this::buildOrderSummary);
    }

    @Override
    @Transactional(readOnly = true)
    public List<OrderSummaryResponse> getUserOrdersByStatus(Long userId, OrderStatus status) {
        return orderRepository.findByUserIdAndStatus(userId, status).stream()
                .map(this::buildOrderSummary)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public void updateOrderStatus(Long orderId, OrderStatus status) {
        Order order = getOrderEntity(orderId);
        OrderStatus oldStatus = order.getStatus();

        order.setStatus(status);
        order.setUpdatedAt(LocalDateTime.now());

        orderRepository.save(order);

        log.info("Order {} status changed: {} -> {}", order.getOrderNumber(), oldStatus, status);
    }

    @Override
    @Transactional
    public void completeOrder(Long orderId) {
        Order order = getOrderEntity(orderId);

        if (order.getStatus() != OrderStatus.PENDING &&
                order.getStatus() != OrderStatus.PROCESSING) {
            throw new InvalidOrderStateException(orderId, order.getStatus(), "complete");
        }

        order.setStatus(OrderStatus.COMPLETED);
        order.setCompletedAt(LocalDateTime.now());
        order.setUpdatedAt(LocalDateTime.now());

        orderRepository.save(order);

        log.info("Order {} completed", order.getOrderNumber());
    }

    @Override
    @Transactional
    public void failOrder(Long orderId, String reason) {
        Order order = getOrderEntity(orderId);

        order.setStatus(OrderStatus.FAILED);
        order.setFailureReason(reason);
        order.setUpdatedAt(LocalDateTime.now());

        orderRepository.save(order);

        log.info("Order {} failed: {}", order.getOrderNumber(), reason);
    }

    @Override
    @Transactional
    public void cancelOrder(Long orderId, Long userId) {
        Order order = getOrderEntity(orderId);

        // Verify user owns the order
        if (!order.getUserId().equals(userId)) {
            throw new OrderNotFoundException(orderId);
        }

        // Can only cancel pending orders
        if (order.getStatus() != OrderStatus.PENDING) {
            throw new InvalidOrderStateException(orderId, order.getStatus(), "cancel");
        }

        order.setStatus(OrderStatus.CANCELLED);
        order.setUpdatedAt(LocalDateTime.now());

        orderRepository.save(order);

        log.info("Order {} cancelled by user {}", order.getOrderNumber(), userId);
    }

    // ===== Private Helpers =====

    private OrderResponse buildOrderResponse(Order order) {
        List<OrderItem> items = orderItemRepository.findByOrderId(order.getId());

        List<OrderItemResponse> itemResponses = items.stream()
                .map(this::buildOrderItemResponse)
                .collect(Collectors.toList());

        OrderResponse response = OrderResponse.builder()
                .id(order.getId())
                .orderNumber(order.getOrderNumber())
                .userId(order.getUserId())
                .status(order.getStatus())
                .items(itemResponses)
                .itemCount(itemResponses.size())
                .subtotal(order.getSubtotal())
                .discountTotal(order.getDiscountTotal())
                .totalAmount(order.getTotalAmount())
                .currency(order.getCurrency())
                .paymentMethod(order.getPaymentMethod())
                .createdAt(order.getCreatedAt())
                .completedAt(order.getCompletedAt())
                .failureReason(order.getFailureReason())
                .build();
                
        return response;
    }

    private OrderItemResponse buildOrderItemResponse(OrderItem item) {
        return OrderItemResponse.builder()
                .id(item.getId())
                .courseId(item.getCourseId())
                .courseTitle(item.getCourseTitle())
                .courseSlug(item.getCourseSlug())
                .courseThumbnailUrl(item.getCourseThumbnailUrl())
                .instructorId(item.getInstructorId())
                .instructorName(item.getInstructorName())
                .finalPrice(item.getFinalPrice())
                .originalPrice(item.getOriginalPrice())
                .discountAmount(item.getDiscountAmount())
                .build();
    }

    private OrderSummaryResponse buildOrderSummary(Order order) {
        int itemCount = orderItemRepository.countByOrderId(order.getId());

        return OrderSummaryResponse.builder()
                .id(order.getId())
                .orderNumber(order.getOrderNumber())
                .status(order.getStatus())
                .itemCount(itemCount)
                .totalAmount(order.getTotalAmount())
                .currency(order.getCurrency())
                .createdAt(order.getCreatedAt())
                .completedAt(order.getCompletedAt())
                .build();
    }
}
