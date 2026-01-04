package com.edumind.lms.modules.payment.service;

import com.edumind.lms.modules.course.entity.Course;
import com.edumind.lms.modules.payment.dto.request.CheckoutRequest;
import com.edumind.lms.modules.payment.dto.request.DirectCheckoutRequest;
import com.edumind.lms.modules.payment.dto.response.OrderResponse;
import com.edumind.lms.modules.payment.dto.response.OrderSummaryResponse;
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
    OrderResponse getOrderById(Long orderId);

    /**
     * Get order by order number
     */
    OrderResponse getOrderByNumber(String orderNumber);

    /**
     * Get order entity (internal use)
     */
    Order getOrderEntity(Long orderId);

    /**
     * Get user's orders with pagination
     */
    Page<OrderSummaryResponse> getUserOrders(Long userId, Pageable pageable);

    /**
     * Get user's orders by status
     */
    List<OrderSummaryResponse> getUserOrdersByStatus(Long userId, OrderStatus status);

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
    void cancelOrder(Long orderId, Long userId);

    /**
     * Create order from cart items (transactional)
     */
    Order createOrderFromCart(Long userId, List<CartItem> cartItems, CheckoutRequest request);

    /**
     * Create order from single course (transactional)
     */
    Order createOrderFromSingleCourse(Long userId, Course course, DirectCheckoutRequest request);
}
