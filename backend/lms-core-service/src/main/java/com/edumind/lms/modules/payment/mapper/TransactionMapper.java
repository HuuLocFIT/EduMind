package com.edumind.lms.modules.payment.mapper;

import com.edumind.lms.modules.payment.dto.response.TransactionResponse;
import com.edumind.lms.modules.payment.entity.Transaction;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.stream.Collectors;

@Component
public class TransactionMapper {

    public TransactionResponse toResponse(Transaction transaction) {
        return TransactionResponse.builder()
                .id(transaction.getId())
                .transactionNumber(transaction.getTransactionNumber())
                .orderId(transaction.getOrder().getId())
                .gateway(transaction.getGateway())
                .gatewayTransactionId(transaction.getGatewayTransactionId())
                .amount(transaction.getAmount())
                .currency(transaction.getCurrency())
                .exchangeRate(transaction.getExchangeRate())
                .localAmount(transaction.getLocalAmount())
                .localCurrency(transaction.getLocalCurrency())
                .status(transaction.getStatus())
                .failureReason(transaction.getFailureReason())
                .createdAt(transaction.getCreatedAt())
                .processedAt(transaction.getProcessedAt())
                .build();
    }

    public List<TransactionResponse> toResponseList(List<Transaction> transactions) {
        return transactions.stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }
}
