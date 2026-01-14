package com.edumind.lms.modules.payment.service;

import com.edumind.lms.modules.payment.entity.InvoiceSequence;
import com.edumind.lms.modules.payment.entity.OrderSequence;
import com.edumind.lms.modules.payment.entity.TransactionSequence;
import com.edumind.lms.modules.payment.repository.InvoiceSequenceRepository;
import com.edumind.lms.modules.payment.repository.OrderSequenceRepository;
import com.edumind.lms.modules.payment.repository.TransactionSequenceRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("NumberGeneratorService Unit Tests")
class NumberGeneratorServiceTest {

    @Mock
    private OrderSequenceRepository orderSequenceRepository;

    @Mock
    private InvoiceSequenceRepository invoiceSequenceRepository;

    @Mock
    private TransactionSequenceRepository transactionSequenceRepository;

    @InjectMocks
    private NumberGeneratorServiceImpl numberGeneratorService;

    private String currentYearMonth;

    @BeforeEach
    void setUp() {
        currentYearMonth = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyyMM"));
    }

    @Nested
    @DisplayName("generateOrderNumber Tests")
    class GenerateOrderNumberTests {

        @Test
        @DisplayName("Should generate order number with existing sequence")
        void generateOrderNumber_ExistingSequence_IncrementsValue() {
            // Given
            OrderSequence sequence = new OrderSequence();
            sequence.setYearMonth(currentYearMonth);
            sequence.setLastValue(5L);

            when(orderSequenceRepository.findByYearMonth(currentYearMonth)).thenReturn(Optional.of(sequence));
            when(orderSequenceRepository.save(any(OrderSequence.class))).thenAnswer(inv -> inv.getArgument(0));

            // When
            String orderNumber = numberGeneratorService.generateOrderNumber();

            // Then
            assertThat(orderNumber).startsWith("ORD-" + currentYearMonth);
            assertThat(orderNumber).endsWith("-0006");
            assertThat(sequence.getLastValue()).isEqualTo(6L);
        }

        @Test
        @DisplayName("Should create new sequence if not exists")
        void generateOrderNumber_NoSequence_CreatesNew() {
            // Given
            when(orderSequenceRepository.findByYearMonth(currentYearMonth)).thenReturn(Optional.empty());
            when(orderSequenceRepository.save(any(OrderSequence.class))).thenAnswer(inv -> inv.getArgument(0));

            // When
            String orderNumber = numberGeneratorService.generateOrderNumber();

            // Then
            assertThat(orderNumber).startsWith("ORD-" + currentYearMonth);
            assertThat(orderNumber).endsWith("-0001");
            verify(orderSequenceRepository, times(2)).save(any(OrderSequence.class));
        }
    }

    @Nested
    @DisplayName("generateInvoiceNumber Tests")
    class GenerateInvoiceNumberTests {

        @Test
        @DisplayName("Should generate invoice number with existing sequence")
        void generateInvoiceNumber_ExistingSequence_IncrementsValue() {
            // Given
            InvoiceSequence sequence = new InvoiceSequence();
            sequence.setYearMonth(currentYearMonth);
            sequence.setLastValue(10L);

            when(invoiceSequenceRepository.findByYearMonth(currentYearMonth)).thenReturn(Optional.of(sequence));
            when(invoiceSequenceRepository.save(any(InvoiceSequence.class))).thenAnswer(inv -> inv.getArgument(0));

            // When
            String invoiceNumber = numberGeneratorService.generateInvoiceNumber();

            // Then
            assertThat(invoiceNumber).startsWith("INV-" + currentYearMonth);
            assertThat(invoiceNumber).endsWith("-0011");
        }
    }

    @Nested
    @DisplayName("generateTransactionNumber Tests")
    class GenerateTransactionNumberTests {

        @Test
        @DisplayName("Should generate transaction number with existing sequence")
        void generateTransactionNumber_ExistingSequence_IncrementsValue() {
            // Given
            TransactionSequence sequence = new TransactionSequence();
            sequence.setYearMonth(currentYearMonth);
            sequence.setLastValue(99L);

            when(transactionSequenceRepository.findByYearMonth(currentYearMonth)).thenReturn(Optional.of(sequence));
            when(transactionSequenceRepository.save(any(TransactionSequence.class))).thenAnswer(inv -> inv.getArgument(0));

            // When
            String transactionNumber = numberGeneratorService.generateTransactionNumber();

            // Then
            assertThat(transactionNumber).startsWith("TXN-" + currentYearMonth);
            assertThat(transactionNumber).endsWith("-0100");
        }
    }
}
