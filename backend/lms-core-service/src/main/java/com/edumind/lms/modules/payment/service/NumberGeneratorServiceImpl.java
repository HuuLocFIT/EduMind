package com.edumind.lms.modules.payment.service;

import com.edumind.lms.modules.payment.entity.InvoiceSequence;
import com.edumind.lms.modules.payment.entity.OrderSequence;
import com.edumind.lms.modules.payment.entity.PayoutSequence;
import com.edumind.lms.modules.payment.entity.TransactionSequence;
import com.edumind.lms.modules.payment.repository.InvoiceSequenceRepository;
import com.edumind.lms.modules.payment.repository.OrderSequenceRepository;
import com.edumind.lms.modules.payment.repository.PayoutSequenceRepository;
import com.edumind.lms.modules.payment.repository.TransactionSequenceRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;

/**
 * Generates sequential numbers for orders, invoices, transactions.
 * Format: PREFIX-YYYYMM-SEQUENCE (e.g., ORD-202501-0001)
 * Sequences reset monthly.
 *
 * Uses REQUIRES_NEW propagation to avoid sequence conflicts in concurrent transactions.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class NumberGeneratorServiceImpl implements NumberGeneratorService {

    private final OrderSequenceRepository orderSequenceRepository;
    private final InvoiceSequenceRepository invoiceSequenceRepository;
    private final TransactionSequenceRepository transactionSequenceRepository;
    private final PayoutSequenceRepository payoutSequenceRepository;

    private static final String ORDER_PREFIX = "ORD";
    private static final String INVOICE_PREFIX = "INV";
    private static final String TRANSACTION_PREFIX = "TXN";
    private static final String PAYOUT_PREFIX = "POUT";

    private static final DateTimeFormatter YEAR_MONTH_FORMATTER = DateTimeFormatter.ofPattern("yyyyMM");

    @Override
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public String generateOrderNumber() {
        String yearMonth = getCurrentYearMonth();

        OrderSequence sequence = orderSequenceRepository.findByYearMonth(yearMonth)
                .orElseGet(() -> createOrderSequence(yearMonth));

        long nextValue = sequence.getLastValue() + 1;
        sequence.setLastValue(nextValue);
        orderSequenceRepository.save(sequence);

        String orderNumber = formatNumber(ORDER_PREFIX, yearMonth, nextValue);
        log.debug("Generated order number: {}", orderNumber);

        return orderNumber;
    }

    @Override
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public String generateInvoiceNumber() {
        String yearMonth = getCurrentYearMonth();

        InvoiceSequence sequence = invoiceSequenceRepository.findByYearMonth(yearMonth)
                .orElseGet(() -> createInvoiceSequence(yearMonth));

        long nextValue = sequence.getLastValue() + 1;
        sequence.setLastValue(nextValue);
        invoiceSequenceRepository.save(sequence);

        String invoiceNumber = formatNumber(INVOICE_PREFIX, yearMonth, nextValue);
        log.debug("Generated invoice number: {}", invoiceNumber);

        return invoiceNumber;
    }

    @Override
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public String generateTransactionNumber() {
        String yearMonth = getCurrentYearMonth();

        TransactionSequence sequence = transactionSequenceRepository.findByYearMonth(yearMonth)
                .orElseGet(() -> createTransactionSequence(yearMonth));

        long nextValue = sequence.getLastValue() + 1;
        sequence.setLastValue(nextValue);
        transactionSequenceRepository.save(sequence);

        String transactionNumber = formatNumber(TRANSACTION_PREFIX, yearMonth, nextValue);
        log.debug("Generated transaction number: {}", transactionNumber);

        return transactionNumber;
    }

    @Override
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public String generatePayoutNumber() {
        String yearMonth = getCurrentYearMonth();

        PayoutSequence sequence = payoutSequenceRepository.findByYearMonth(yearMonth)
                .orElseGet(() -> createPayoutSequence(yearMonth));

        long nextValue = sequence.getLastValue() + 1;
        sequence.setLastValue(nextValue);
        payoutSequenceRepository.save(sequence);

        String payoutNumber = formatNumber(PAYOUT_PREFIX, yearMonth, nextValue);
        log.debug("Generated payout number: {}", payoutNumber);

        return payoutNumber;
    }

    // ===== Private Helpers =====

    private String getCurrentYearMonth() {
        return LocalDate.now().format(YEAR_MONTH_FORMATTER);
    }

    private String formatNumber(String prefix, String yearMonth, long sequence) {
        return String.format("%s-%s-%04d", prefix, yearMonth, sequence);
    }

    private OrderSequence createOrderSequence(String yearMonth) {
        OrderSequence sequence = new OrderSequence();
        sequence.setYearMonth(yearMonth);
        sequence.setLastValue(0L);
        return orderSequenceRepository.save(sequence);
    }

    private InvoiceSequence createInvoiceSequence(String yearMonth) {
        InvoiceSequence sequence = new InvoiceSequence();
        sequence.setYearMonth(yearMonth);
        sequence.setLastValue(0L);
        return invoiceSequenceRepository.save(sequence);
    }

    private TransactionSequence createTransactionSequence(String yearMonth) {
        TransactionSequence sequence = new TransactionSequence();
        sequence.setYearMonth(yearMonth);
        sequence.setLastValue(0L);
        return transactionSequenceRepository.save(sequence);
    }

    private PayoutSequence createPayoutSequence(String yearMonth) {
        PayoutSequence sequence = new PayoutSequence();
        sequence.setYearMonth(yearMonth);
        sequence.setLastValue(0L);
        return payoutSequenceRepository.save(sequence);
    }
}
