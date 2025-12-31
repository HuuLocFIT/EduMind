package com.edumind.lms.modules.payment.service;

import com.edumind.lms.modules.payment.dto.response.CourseEarningResponse;
import com.edumind.lms.modules.payment.dto.response.EarningResponse;
import com.edumind.lms.modules.payment.dto.response.EarningsSummaryResponse;
import com.edumind.lms.modules.payment.entity.InstructorEarning;
import com.edumind.lms.modules.payment.entity.Order;
import com.edumind.lms.modules.payment.entity.OrderItem;
import com.edumind.lms.modules.payment.enums.EarningStatus;
import com.edumind.lms.modules.payment.exception.InstructorEarningNotFoundException;
import com.edumind.lms.modules.payment.mapper.EarningMapper;
import com.edumind.lms.modules.payment.repository.InstructorEarningRepository;
import com.edumind.lms.modules.payment.repository.OrderItemRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class EarningServiceImpl implements EarningService {

    private final InstructorEarningRepository earningRepository;
    private final OrderItemRepository orderItemRepository;
    private final PlatformConfigService platformConfigService;
    private final EarningMapper earningMapper;

    @Override
    @Transactional
    public void createEarningsForOrder(Order order) {
        log.info("Creating earnings for order: {}", order.getOrderNumber());

        List<OrderItem> orderItems = orderItemRepository.findByOrderId(order.getId());
        BigDecimal platformFeePercent = platformConfigService.getPlatformFeePercent();

        for (OrderItem orderItem : orderItems) {
            // Check if earning already exists
            if (earningRepository.findByOrderId(order.getId()).stream()
                    .anyMatch(e -> e.getOrderItem().getId().equals(orderItem.getId()))) {
                log.debug("Earning already exists for order item: {}", orderItem.getId());
                continue;
            }

            InstructorEarning earning = InstructorEarning.create(
                    orderItem,
                    order,
                    platformFeePercent
            );

            earningRepository.save(earning);
            log.debug("Created earning for instructor {} from order item {}",
                    orderItem.getInstructorId(), orderItem.getId());
        }

        log.info("Created earnings for order: {}", order.getOrderNumber());
    }

    @Override
    @Transactional(readOnly = true)
    public EarningsSummaryResponse getEarningsSummary(Long instructorId) {
        log.debug("Getting earnings summary for instructor: {}", instructorId);

        // Total earnings
        BigDecimal totalGross = earningRepository.sumTotalGrossAmountByInstructorId(instructorId);
        BigDecimal totalNet = earningRepository.sumTotalNetAmountByInstructorId(instructorId);
        BigDecimal totalPlatformFees = totalGross.subtract(totalNet);

        // By status
        BigDecimal pending = earningRepository.sumNetAmountByInstructorIdAndStatus(
                instructorId, EarningStatus.PENDING);
        BigDecimal available = earningRepository.sumNetAmountByInstructorIdAndStatus(
                instructorId, EarningStatus.AVAILABLE);
        BigDecimal paid = earningRepository.sumNetAmountByInstructorIdAndStatus(
                instructorId, EarningStatus.PAID);

        // Current month
        YearMonth currentMonth = YearMonth.now();
        LocalDateTime currentMonthStart = currentMonth.atDay(1).atStartOfDay();
        LocalDateTime currentMonthEnd = currentMonth.atEndOfMonth().atTime(23, 59, 59);

        BigDecimal currentMonthNet = earningRepository.sumNetAmountByInstructorIdAndDateRange(
                instructorId, currentMonthStart, currentMonthEnd);
        long currentMonthSales = earningRepository.findByInstructorIdAndDateRange(
                instructorId, currentMonthStart, currentMonthEnd).size();

        // Previous month
        YearMonth previousMonth = currentMonth.minusMonths(1);
        LocalDateTime previousMonthStart = previousMonth.atDay(1).atStartOfDay();
        LocalDateTime previousMonthEnd = previousMonth.atEndOfMonth().atTime(23, 59, 59);

        BigDecimal previousMonthNet = earningRepository.sumNetAmountByInstructorIdAndDateRange(
                instructorId, previousMonthStart, previousMonthEnd);
        long previousMonthSales = earningRepository.findByInstructorIdAndDateRange(
                instructorId, previousMonthStart, previousMonthEnd).size();

        // Calculate growth
        BigDecimal growthPercent = BigDecimal.ZERO;
        if (previousMonthNet.compareTo(BigDecimal.ZERO) > 0) {
            growthPercent = currentMonthNet.subtract(previousMonthNet)
                    .divide(previousMonthNet, 4, RoundingMode.HALF_UP)
                    .multiply(BigDecimal.valueOf(100));
        } else if (currentMonthNet.compareTo(BigDecimal.ZERO) > 0) {
            growthPercent = BigDecimal.valueOf(100); // 100% growth from 0
        }

        // Stats
        long totalSales = earningRepository.countSalesByInstructorId(instructorId);

        // Top courses
        List<Object[]> topCoursesData = earningRepository.findTopCoursesByEarnings(
                instructorId, Pageable.ofSize(5));
        List<CourseEarningResponse> topCourses = topCoursesData.stream()
                .map((Object[] data) -> CourseEarningResponse.builder()
                        .courseId((Long) data[0])
                        .totalGrossEarnings((BigDecimal) data[1])
                        .totalNetEarnings((BigDecimal) data[1]) // Using gross as net for now
                        .currency("USD")
                        .build())
                .collect(Collectors.toList());

        return EarningsSummaryResponse.builder()
                .instructorId(instructorId)
                .totalGrossEarnings(totalGross)
                .totalNetEarnings(totalNet)
                .totalPlatformFees(totalPlatformFees)
                .pendingEarnings(pending)
                .availableEarnings(available)
                .paidEarnings(paid)
                .currentMonthGross(currentMonthNet) // Using net for now
                .currentMonthNet(currentMonthNet)
                .currentMonthSales((int) currentMonthSales)
                .previousMonthGross(previousMonthNet)
                .previousMonthNet(previousMonthNet)
                .previousMonthSales((int) previousMonthSales)
                .monthOverMonthGrowthPercent(growthPercent)
                .totalSales(totalSales)
                .totalCoursesSold(topCourses.size())
                .topCourses(topCourses)
                .currency("USD")
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public Page<EarningResponse> getInstructorEarnings(Long instructorId, Pageable pageable) {
        Page<InstructorEarning> earnings = earningRepository.findByInstructorIdOrderByCreatedAtDesc(
                instructorId, pageable);
        return earnings.map(earningMapper::toResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<EarningResponse> getInstructorEarningsByStatus(Long instructorId,
                                                               EarningStatus status,
                                                               Pageable pageable) {
        Page<InstructorEarning> earnings = earningRepository.findByInstructorIdAndStatusOrderByCreatedAtDesc(
                instructorId, status, pageable);
        return earnings.map(earningMapper::toResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<EarningResponse> getInstructorEarningsForPeriod(Long instructorId,
                                                                LocalDate startDate,
                                                                LocalDate endDate,
                                                                Pageable pageable) {
        LocalDateTime start = startDate.atStartOfDay();
        LocalDateTime end = endDate.atTime(23, 59, 59);

        List<InstructorEarning> earnings = earningRepository.findByInstructorIdAndDateRange(
                instructorId, start, end);

        // Manual pagination
        int startIndex = (int) pageable.getOffset();
        int endIndex = Math.min(startIndex + pageable.getPageSize(), earnings.size());
        List<InstructorEarning> pagedEarnings = earnings.subList(startIndex, endIndex);

        List<EarningResponse> responses = pagedEarnings.stream()
                .map(earningMapper::toResponse)
                .collect(Collectors.toList());

        return new PageImpl<>(responses, pageable, earnings.size());
    }

    @Override
    @Transactional
    public void markEarningsAvailable(Long earningId) {
        log.info("Marking earning {} as available", earningId);

        InstructorEarning earning = earningRepository.findById(earningId)
                .orElseThrow(() -> new InstructorEarningNotFoundException(earningId));

        earning.markAsAvailable();
        earningRepository.save(earning);

        log.info("Earning {} marked as available", earningId);
    }

    @Override
    @Transactional
    public void markEarningsPaid(Long earningId, String payoutReference) {
        log.info("Marking earning {} as paid with reference: {}", earningId, payoutReference);

        InstructorEarning earning = earningRepository.findById(earningId)
                .orElseThrow(() -> new InstructorEarningNotFoundException(earningId));

        // Parse payoutReference as Long if possible, otherwise use null
        Long payoutId = null;
        try {
            payoutId = Long.parseLong(payoutReference);
        } catch (NumberFormatException e) {
            log.warn("Could not parse payout reference as Long: {}", payoutReference);
        }

        earning.markAsPaid(payoutId);
        earningRepository.save(earning);

        log.info("Earning {} marked as paid", earningId);
    }
}

