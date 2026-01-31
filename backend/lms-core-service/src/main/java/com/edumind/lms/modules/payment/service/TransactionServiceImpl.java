package com.edumind.lms.modules.payment.service;

import com.edumind.lms.modules.payment.dto.response.TransactionResponse;
import com.edumind.lms.modules.payment.entity.Order;
import com.edumind.lms.modules.payment.entity.Transaction;
import com.edumind.lms.modules.payment.enums.TransactionStatus;
import com.edumind.lms.modules.payment.exception.TransactionNotFoundException;
import com.edumind.lms.modules.payment.gateway.GatewayPaymentResult;
import com.edumind.lms.modules.payment.gateway.GatewayResultStatus;
import com.edumind.lms.modules.payment.mapper.TransactionMapper;
import com.edumind.lms.modules.payment.repository.TransactionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class TransactionServiceImpl implements TransactionService {

    private final TransactionRepository transactionRepository;
    private final TransactionMapper transactionMapper;
    private final NumberGeneratorService numberGeneratorService;

    @Override
    @Transactional
    public Transaction createTransaction(Order order, GatewayPaymentResult result) {
        log.info("Creating transaction for order: {}", order.getOrderNumber());

        Transaction transaction = new Transaction();
        transaction.setTransactionNumber(numberGeneratorService.generateTransactionNumber());
        transaction.setOrder(order);

        // Gateway info
        transaction.setGateway(order.getPaymentMethod());
        transaction.setGatewayTransactionId(result.getGatewayTransactionId());

        // Amount
        transaction.setAmount(result.getAmount() != null ? result.getAmount() : order.getTotalAmount());
        transaction.setCurrency(result.getCurrency() != null ? result.getCurrency() : order.getCurrency());

        // Local currency (for SePay)
        if (result.getLocalAmount() != null) {
            transaction.setLocalAmount(result.getLocalAmount());
            transaction.setLocalCurrency(result.getLocalCurrency());
            transaction.setExchangeRate(result.getExchangeRate());
        }

        // Status
        transaction.setStatus(mapGatewayStatus(result.getStatus()));

        if (!result.isSuccess()) {
            transaction.setFailureCode(result.getErrorCode());
            transaction.setFailureReason(result.getErrorMessage());
        }

        // Redirect info
        transaction.setRedirectUrl(result.getRedirectUrl());

        // Raw response
        transaction.setGatewayResponse(result.getRawResponse());

        // Timestamps
        transaction.setCreatedAt(LocalDateTime.now());
        if (result.isSuccess()) {
            transaction.setProcessedAt(LocalDateTime.now());
        }

        Transaction saved = transactionRepository.save(transaction);

        log.info("Transaction created: {} with status {}",
                saved.getTransactionNumber(), saved.getStatus());

        return saved;
    }

    @Override
    @Transactional(readOnly = true)
    public TransactionResponse getTransactionById(Long transactionId) {
        Transaction transaction = transactionRepository.findById(transactionId)
                .orElseThrow(() -> new TransactionNotFoundException(transactionId));
        return transactionMapper.toResponse(transaction);
    }

    @Override
    @Transactional(readOnly = true)
    public TransactionResponse getTransactionByNumber(String transactionNumber) {
        Transaction transaction = transactionRepository.findByTransactionNumber(transactionNumber)
                .orElseThrow(() -> new TransactionNotFoundException(transactionNumber));
        return transactionMapper.toResponse(transaction);
    }

    @Override
    @Transactional(readOnly = true)
    public List<TransactionResponse> getTransactionsByOrder(Long orderId) {
        return transactionRepository.findByOrderId(orderId).stream()
                .map(transactionMapper::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public void updateTransactionFromGateway(String gatewayTransactionId, GatewayPaymentResult result) {
        log.info("Updating transaction from gateway callback: {}", gatewayTransactionId);

        Transaction transaction = transactionRepository.findByGatewayTransactionId(gatewayTransactionId)
                .orElseThrow(() -> new TransactionNotFoundException(gatewayTransactionId));

        if (transaction.getStatus() == TransactionStatus.SUCCESS) {
            log.info("Transaction {} is already SUCCESS. Ignoring update from gateway.", transaction.getTransactionNumber());
            // We can still update the latest gateway response if needed for auditing
            transaction.setGatewayResponse(result.getRawResponse());
            transactionRepository.save(transaction);
            return;
        }

        transaction.setStatus(mapGatewayStatus(result.getStatus()));

        if (!result.isSuccess()) {
            transaction.setFailureCode(result.getErrorCode());
            transaction.setFailureReason(result.getErrorMessage());
        } else {
            // Only set processedAt if it's not already set
            if (transaction.getProcessedAt() == null) {
                transaction.setProcessedAt(LocalDateTime.now());
            }
        }

        transaction.setGatewayResponse(result.getRawResponse());

        transactionRepository.save(transaction);

        log.info("Transaction {} updated to status {}",
                transaction.getTransactionNumber(), transaction.getStatus());
    }

    // ===== Private Helpers =====

    private TransactionStatus mapGatewayStatus(GatewayResultStatus gatewayStatus) {
        return switch (gatewayStatus) {
            case SUCCESS -> TransactionStatus.SUCCESS;
            case FAILED -> TransactionStatus.FAILED;
            case PENDING, REQUIRES_ACTION, UNKNOWN -> TransactionStatus.PENDING;
            case CANCELLED -> TransactionStatus.CANCELLED;
            case EXPIRED -> TransactionStatus.EXPIRED;
        };
    }
}
