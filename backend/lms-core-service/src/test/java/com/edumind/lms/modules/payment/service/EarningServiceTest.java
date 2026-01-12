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
    }
}
