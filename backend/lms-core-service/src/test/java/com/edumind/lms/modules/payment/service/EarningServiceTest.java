package com.edumind.lms.modules.payment.service;

import com.edumind.lms.modules.payment.dto.response.EarningResponse;
import com.edumind.lms.modules.payment.dto.response.EarningsSummaryResponse;
import com.edumind.lms.modules.payment.dto.response.MonthlyEarningResponse;
import com.edumind.lms.modules.payment.entity.InstructorEarning;
import com.edumind.lms.modules.payment.entity.Order;
import com.edumind.lms.modules.payment.entity.OrderItem;
import com.edumind.lms.modules.payment.enums.EarningStatus;
import com.edumind.lms.modules.payment.enums.OrderStatus;
import com.edumind.lms.modules.payment.exception.InstructorEarningNotFoundException;
import com.edumind.lms.modules.payment.mapper.EarningMapper;
import com.edumind.lms.modules.payment.repository.InstructorEarningRepository;
import com.edumind.lms.modules.payment.repository.OrderItemRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("EarningService Unit Tests")
class EarningServiceTest {

    @Mock
    private InstructorEarningRepository earningRepository;

    @Mock
    private OrderItemRepository orderItemRepository;

    @Mock
    private PlatformConfigService platformConfigService;

    @Mock
    private EarningMapper earningMapper;

    @InjectMocks
    private EarningServiceImpl earningService;

    private Long instructorId = 1L;
    private Long earningId = 100L;
    private Long orderId = 200L;
    private Order order;
    private OrderItem orderItem;
    private InstructorEarning earning;
    private EarningResponse earningResponse;

    @BeforeEach
    void setUp() {
        order = new Order();
        order.setId(orderId);
        order.setOrderNumber("ORD-2026-001");
        order.setUserId(10L);
        order.setStatus(OrderStatus.COMPLETED);
        order.setTotalAmount(new BigDecimal("100.00"));
        order.setCurrency("USD");

        orderItem = new OrderItem();
        orderItem.setId(300L);
        orderItem.setOrder(order);
        orderItem.setCourseId(1L);
        orderItem.setCourseTitle("Test Course");
        orderItem.setInstructorId(instructorId);
        orderItem.setFinalPrice(new BigDecimal("100.00"));
        orderItem.setOriginalPrice(new BigDecimal("100.00"));
        orderItem.setDiscountAmount(BigDecimal.ZERO);
        orderItem.setCurrency("USD");

        earning = new InstructorEarning();
        earning.setId(earningId);
        earning.setInstructorId(instructorId);
        earning.setCourseId(1L);
        earning.setOrderItem(orderItem);
        earning.setOrder(order);
        earning.setGrossAmount(new BigDecimal("100.00"));
        earning.setNetAmount(new BigDecimal("80.00"));
        earning.setPlatformFeePercent(new BigDecimal("20"));
        earning.setPlatformFeeAmount(new BigDecimal("20.00"));
        earning.setStatus(EarningStatus.PENDING);
        earning.setCurrency("USD");
        earning.setCreatedAt(LocalDateTime.now());

        earningResponse = EarningResponse.builder()
                .id(earningId)
                .instructorId(instructorId)
                .courseId(1L)
                .courseTitle("Test Course")
                .grossAmount(new BigDecimal("100.00"))
                .netAmount(new BigDecimal("80.00"))
                .status(EarningStatus.PENDING)
                .currency("USD")
                .build();
    }

    @Nested
    @DisplayName("createEarningsForOrder Tests")
    class CreateEarningsForOrderTests {

        @Test
        @DisplayName("Should create earnings for order items")
        void createEarningsForOrder_Success_CreatesEarnings() {
            // Given
            when(orderItemRepository.findByOrderId(orderId)).thenReturn(List.of(orderItem));
            when(platformConfigService.getPlatformFeePercent()).thenReturn(new BigDecimal("20"));
            when(earningRepository.findByOrderId(orderId)).thenReturn(Collections.emptyList());
            when(earningRepository.save(any(InstructorEarning.class))).thenReturn(earning);

            // When
            earningService.createEarningsForOrder(order);

            // Then
            verify(earningRepository).save(any(InstructorEarning.class));
        }

        @Test
        @DisplayName("Should skip if earning already exists for order item")
        void createEarningsForOrder_AlreadyExists_Skips() {
            // Given
            when(orderItemRepository.findByOrderId(orderId)).thenReturn(List.of(orderItem));
            when(earningRepository.findByOrderId(orderId)).thenReturn(List.of(earning));

            // When
            earningService.createEarningsForOrder(order);

            // Then
            verify(earningRepository, never()).save(any(InstructorEarning.class));
        }
    }

    @Nested
    @DisplayName("getInstructorEarnings Tests")
    class GetInstructorEarningsTests {

        @Test
        @DisplayName("Should return paginated earnings for instructor")
        void getInstructorEarnings_ReturnsPage() {
            // Given
            Pageable pageable = PageRequest.of(0, 10);
            Page<InstructorEarning> earningPage = new PageImpl<>(List.of(earning));

            when(earningRepository.findByInstructorIdOrderByCreatedAtDesc(instructorId, pageable)).thenReturn(earningPage);
            when(earningMapper.toResponse(earning)).thenReturn(earningResponse);

            // When
            Page<EarningResponse> result = earningService.getInstructorEarnings(instructorId, pageable);

            // Then
            assertThat(result.getContent()).hasSize(1);
        }

        @Test
        @DisplayName("Should return empty page if no earnings")
        void getInstructorEarnings_Empty_ReturnsEmptyPage() {
            // Given
            Pageable pageable = PageRequest.of(0, 10);
            Page<InstructorEarning> emptyPage = new PageImpl<>(Collections.emptyList());

            when(earningRepository.findByInstructorIdOrderByCreatedAtDesc(instructorId, pageable)).thenReturn(emptyPage);

            // When
            Page<EarningResponse> result = earningService.getInstructorEarnings(instructorId, pageable);

            // Then
            assertThat(result.getContent()).isEmpty();
            assertThat(result.getTotalElements()).isZero();
        }
    }

    @Nested
    @DisplayName("getInstructorEarningsByStatus Tests")
    class GetInstructorEarningsByStatusTests {

        @Test
        @DisplayName("Should return earnings filtered by status")
        void getInstructorEarningsByStatus_ReturnsFiltered() {
            // Given
            Pageable pageable = PageRequest.of(0, 10);
            Page<InstructorEarning> earningPage = new PageImpl<>(List.of(earning));

            when(earningRepository.findByInstructorIdAndStatusOrderByCreatedAtDesc(instructorId, EarningStatus.PENDING, pageable))
                    .thenReturn(earningPage);
            when(earningMapper.toResponse(earning)).thenReturn(earningResponse);

            // When
            Page<EarningResponse> result = earningService.getInstructorEarningsByStatus(instructorId, EarningStatus.PENDING, pageable);

            // Then
            assertThat(result.getContent()).hasSize(1);
        }
    }

    @Nested
    @DisplayName("getMonthlyEarnings Tests")
    class GetMonthlyEarningsTests {

        @Test
        @DisplayName("Should return monthly earnings for specified months")
        void getMonthlyEarnings_ReturnsMonthlyData() {
            // Given
            when(earningRepository.findByInstructorIdAndDateRange(eq(instructorId), any(), any()))
                    .thenReturn(List.of(earning));

            // When
            List<MonthlyEarningResponse> result = earningService.getMonthlyEarnings(instructorId, 3);

            // Then
            assertThat(result).hasSize(3);
        }
    }

    @Nested
    @DisplayName("markEarningsAvailable Tests")
    class MarkEarningsAvailableTests {

        @Test
        @DisplayName("Should mark earning as available")
        void markEarningsAvailable_Success() {
            // Given
            when(earningRepository.findById(earningId)).thenReturn(Optional.of(earning));
            when(earningRepository.save(any(InstructorEarning.class))).thenReturn(earning);

            // When
            earningService.markEarningsAvailable(earningId);

            // Then
            assertThat(earning.getStatus()).isEqualTo(EarningStatus.AVAILABLE);
            verify(earningRepository).save(earning);
        }

        @Test
        @DisplayName("Should throw exception if earning not found")
        void markEarningsAvailable_NotFound_ThrowsException() {
            // Given
            when(earningRepository.findById(earningId)).thenReturn(Optional.empty());

            // When & Then
            assertThatThrownBy(() -> earningService.markEarningsAvailable(earningId))
                    .isInstanceOf(InstructorEarningNotFoundException.class);
        }
    }

    @Nested
    @DisplayName("markEarningsPaid Tests")
    class MarkEarningsPaidTests {

        @Test
        @DisplayName("Should mark earning as paid")
        void markEarningsPaid_Success() {
            // Given
            earning.setStatus(EarningStatus.AVAILABLE);
            when(earningRepository.findById(earningId)).thenReturn(Optional.of(earning));
            when(earningRepository.save(any(InstructorEarning.class))).thenReturn(earning);

            // When
            earningService.markEarningsPaid(earningId, "PAYOUT-123");

            // Then
            assertThat(earning.getStatus()).isEqualTo(EarningStatus.PAID);
            verify(earningRepository).save(earning);
        }

        @Test
        @DisplayName("Should throw exception if earning not found")
        void markEarningsPaid_NotFound_ThrowsException() {
            // Given
            when(earningRepository.findById(earningId)).thenReturn(Optional.empty());

            // When & Then
            assertThatThrownBy(() -> earningService.markEarningsPaid(earningId, "PAYOUT-123"))
                    .isInstanceOf(InstructorEarningNotFoundException.class);
        }
    }

    @Nested
    @DisplayName("getEarningByIdAndInstructor Tests")
    class GetEarningByIdAndInstructorTests {

        @Test
        @DisplayName("Should return earning for valid instructor")
        void getEarningByIdAndInstructor_ValidInstructor_ReturnsEarning() {
            // Given
            when(earningRepository.findById(earningId)).thenReturn(Optional.of(earning));
            when(earningMapper.toResponse(earning)).thenReturn(earningResponse);

            // When
            EarningResponse result = earningService.getEarningByIdAndInstructor(earningId, instructorId);

            // Then
            assertThat(result).isNotNull();
        }

        @Test
        @DisplayName("Should throw exception if instructor mismatch")
        void getEarningByIdAndInstructor_WrongInstructor_ThrowsException() {
            // Given
            when(earningRepository.findById(earningId)).thenReturn(Optional.of(earning));

            // When & Then
            assertThatThrownBy(() -> earningService.getEarningByIdAndInstructor(earningId, 999L))
                    .isInstanceOf(InstructorEarningNotFoundException.class);
        }

        @Test
        @DisplayName("Should throw exception if earning not found")
        void getEarningByIdAndInstructor_NotFound_ThrowsException() {
            // Given
            when(earningRepository.findById(earningId)).thenReturn(Optional.empty());

            // When & Then
            assertThatThrownBy(() -> earningService.getEarningByIdAndInstructor(earningId, instructorId))
                    .isInstanceOf(InstructorEarningNotFoundException.class);
        }
    }

    @Nested
    @DisplayName("getEarningsSummary Tests")
    class GetEarningsSummaryTests {

        @Test
        @DisplayName("Should return correct summary")
        void getEarningsSummary_ReturnsCorrectSummary() {
            // Given
            when(earningRepository.sumTotalGrossAmountByInstructorId(instructorId)).thenReturn(new BigDecimal("1000.00"));
            when(earningRepository.sumTotalNetAmountByInstructorId(instructorId)).thenReturn(new BigDecimal("800.00"));
            when(earningRepository.sumNetAmountByInstructorIdAndStatus(eq(instructorId), eq(EarningStatus.PENDING))).thenReturn(new BigDecimal("200.00"));
            when(earningRepository.sumNetAmountByInstructorIdAndStatus(eq(instructorId), eq(EarningStatus.AVAILABLE))).thenReturn(new BigDecimal("300.00"));
            when(earningRepository.sumNetAmountByInstructorIdAndStatus(eq(instructorId), eq(EarningStatus.PAID))).thenReturn(new BigDecimal("300.00"));
            when(earningRepository.sumNetAmountByInstructorIdAndDateRange(eq(instructorId), any(), any())).thenReturn(new BigDecimal("100.00"));
            when(earningRepository.findByInstructorIdAndDateRange(eq(instructorId), any(), any())).thenReturn(List.of(earning));
            when(earningRepository.countSalesByInstructorId(instructorId)).thenReturn(10L);
            when(earningRepository.findTopCoursesByEarnings(eq(instructorId), any())).thenReturn(Collections.emptyList());

            // When
            EarningsSummaryResponse result = earningService.getEarningsSummary(instructorId);

            // Then
            assertThat(result).isNotNull();
            assertThat(result.getTotalGrossEarnings()).isEqualByComparingTo("1000.00");
            assertThat(result.getTotalNetEarnings()).isEqualByComparingTo("800.00");
            assertThat(result.getTotalPlatformFees()).isEqualByComparingTo("200.00");
        }
    }

    @Nested
    @DisplayName("exportEarningsToCsv Tests")
    class ExportEarningsToCsvTests {

        @Test
        @DisplayName("Should return valid CSV bytes")
        void exportEarningsToCsv_ReturnsValidCsv() {
            // Given
            when(earningRepository.findByInstructorIdAndDateRange(eq(instructorId), any(), any()))
                    .thenReturn(List.of(earning));

            // When
            byte[] csvBytes = earningService.exportEarningsToCsv(instructorId, LocalDate.now().minusMonths(1), LocalDate.now(), null);

            // Then
            assertThat(csvBytes).isNotEmpty();
            String csvContent = new String(csvBytes);
            assertThat(csvContent).contains("Date,Order Number,Course Title,Status,Gross Amount,Platform Fee,Net Amount,Currency");
            assertThat(csvContent).contains("PENDING");
        }
    }

    @Nested
    @DisplayName("getEarningsByCourse Tests")
    class GetEarningsByCourseTests {

        @Test
        @DisplayName("Should return earnings grouped by course")
        void getEarningsByCourse_ReturnsCourseEarnings() {
            // Given
            when(earningRepository.findByInstructorIdAndDateRange(eq(instructorId), any(), any()))
                    .thenReturn(List.of(earning));

            // When
            var result = earningService.getEarningsByCourse(instructorId, LocalDate.now().minusMonths(1), LocalDate.now());

            // Then
            assertThat(result).hasSize(1);
            assertThat(result.get(0).getCourseId()).isEqualTo(1L);
        }
    }
}
