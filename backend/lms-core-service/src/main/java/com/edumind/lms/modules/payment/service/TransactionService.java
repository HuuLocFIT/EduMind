package com.edumind.lms.modules.payment.service;

import com.edumind.lms.modules.payment.dto.response.TransactionResponse;
import com.edumind.lms.modules.payment.entity.Order;
import com.edumind.lms.modules.payment.entity.Transaction;
import com.edumind.lms.modules.payment.gateway.GatewayPaymentResult;

import java.util.List;

/**
 * Service to manage payment transactions.
 */
public interface TransactionService {

    /**
     * Create transaction from gateway result
     */
    Transaction createTransaction(Order order, GatewayPaymentResult result);

    /**
     * Get transaction by ID
     */
    TransactionResponse getTransactionById(Long transactionId);

    /**
     * Get transaction by transaction number
     */
    TransactionResponse getTransactionByNumber(String transactionNumber);

    /**
     * Get transactions for an order
     */
    List<TransactionResponse> getTransactionsByOrder(Long orderId);

    /**
     * Update transaction from gateway callback/webhook
     */
    void updateTransactionFromGateway(String gatewayTransactionId, GatewayPaymentResult result);
}
