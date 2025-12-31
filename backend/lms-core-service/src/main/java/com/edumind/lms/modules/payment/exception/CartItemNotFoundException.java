package com.edumind.lms.modules.payment.exception;

import com.edumind.common.exception.ResourceNotFoundException;

public class CartItemNotFoundException extends ResourceNotFoundException {
    
  public CartItemNotFoundException(Long courseId) {
      super("Cart item not found for courseId: " + courseId);
  }
}
