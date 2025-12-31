package com.edumind.lms.modules.payment.exception;

import com.edumind.common.exception.ResourceNotFoundException;

public class OrderNotFoundException extends ResourceNotFoundException {
    
    public OrderNotFoundException(Long orderId) {
        super("Order not found with id: " + orderId);
    }
    
    public OrderNotFoundException(String orderNumber) {
        super("Order not found with orderNumber: " + orderNumber);
    }
}
