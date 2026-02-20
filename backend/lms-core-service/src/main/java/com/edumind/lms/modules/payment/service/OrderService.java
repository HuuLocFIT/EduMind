package com.edumind.lms.modules.payment.service;

import com.edumind.lms.modules.course.api.dto.CourseInfo;
import com.edumind.lms.modules.payment.dto.request.CheckoutRequest;
import com.edumind.lms.modules.payment.dto.request.DirectCheckoutRequest;
import com.edumind.lms.modules.payment.dto.response.OrderResponse;
import com.edumind.lms.modules.payment.dto.response.OrderSummaryResponse;
import com.edumind.lms.modules.payment.dto.response.OrderCountResponse;
import com.edumind.lms.modules.payment.entity.CartItem;
import com.edumind.lms.modules.payment.entity.Order;
import com.edumind.lms.modules.payment.enums.OrderStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

/**
 * Service to manage orders.
 */
public interface OrderService {

    /**
     * Get order by ID
     */
    /**
     * Get order by ID and User (security check)
     */
    OrderResponse getOrderByIdAndUser(Long orderId, Long userId);

    /**
     * Get order by order number and User (security check)
     */
    OrderResponse getOrderByNumberAndUser(String orderNumber, Long userId);

    /**
     * Get order entity (internal use)
     */
    Order getOrderEntity(Long orderId);

    /**
     * Get user's orders with pagination
     */
    Page<OrderSummaryResponse> getOrdersByUser(Long userId, Pageable pageable);

    /**
     * Get user's orders by status
     */
    Page<OrderSummaryResponse> getOrdersByUserAndStatus(Long userId, OrderStatus status, Pageable pageable);

    /**
     * Update order status
     */
    void updateOrderStatus(Long orderId, OrderStatus status);

    /**
     * Mark order as completed
     */
    void completeOrder(Long orderId);

    /**
     * Mark order as failed
     */
    void failOrder(Long orderId, String reason);

    /**
     * Cancel order (by user, before payment)
     */
    OrderResponse cancelOrder(Long orderId, Long userId);

    /**
     * Request refund (by user, after payment)
     */
    OrderResponse requestRefund(Long orderId, Long userId, String reason);

    /**
     * Get order counts by status for user
     */
    OrderCountResponse getOrderCountsByUser(Long userId);

    /**
     * Create order from cart items (transactional)
     */
    Order createOrderFromCart(Long userId, List<CartItem> cartItems, CheckoutRequest request);

    /**
     * Create order from single course (transactional)
     */
    Order createOrderFromSingleCourse(Long userId, CourseInfo course, DirectCheckoutRequest request);
}
