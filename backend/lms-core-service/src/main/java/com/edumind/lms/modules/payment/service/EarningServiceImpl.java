package com.edumind.lms.modules.payment.service;

import com.edumind.lms.modules.payment.dto.response.CourseEarningResponse;
import com.edumind.lms.modules.payment.dto.response.EarningResponse;
import com.edumind.lms.modules.payment.dto.response.EarningsSummaryResponse;
import com.edumind.lms.modules.payment.dto.response.MonthlyEarningResponse;
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
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.io.PrintWriter;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
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

        // Fetch existing earnings once before the loop to avoid N+1 query problem
        List<InstructorEarning> existingEarnings = earningRepository.findByOrderId(order.getId());
        Set<Long> existingOrderItemIds = existingEarnings.stream()
                .map(e -> e.getOrderItem().getId())
                .collect(Collectors.toSet());

        for (OrderItem orderItem : orderItems) {
            // Check if earning already exists
            if (existingOrderItemIds.contains(orderItem.getId())) {
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
        // Total earnings
        BigDecimal totalGross = safeBigDecimal(earningRepository.sumTotalGrossAmountByInstructorId(instructorId));
        BigDecimal totalNet = safeBigDecimal(earningRepository.sumTotalNetAmountByInstructorId(instructorId));
        BigDecimal totalPlatformFees = totalGross.subtract(totalNet);

        // By status
        BigDecimal pending = safeBigDecimal(earningRepository.sumNetAmountByInstructorIdAndStatus(
                instructorId, EarningStatus.PENDING));
        BigDecimal available = safeBigDecimal(earningRepository.sumNetAmountByInstructorIdAndStatus(
                instructorId, EarningStatus.AVAILABLE));
        BigDecimal paid = safeBigDecimal(earningRepository.sumNetAmountByInstructorIdAndStatus(
                instructorId, EarningStatus.PAID));

        // Current month
        YearMonth currentMonth = YearMonth.now();
        LocalDateTime currentMonthStart = currentMonth.atDay(1).atStartOfDay();
        LocalDateTime currentMonthEnd = currentMonth.atEndOfMonth().atTime(23, 59, 59);

        BigDecimal currentMonthNet = safeBigDecimal(earningRepository.sumNetAmountByInstructorIdAndDateRange(
                instructorId, currentMonthStart, currentMonthEnd));
        long currentMonthSales = earningRepository.findByInstructorIdAndDateRange(
                instructorId, currentMonthStart, currentMonthEnd).size();

        // Previous month
        YearMonth previousMonth = currentMonth.minusMonths(1);
        LocalDateTime previousMonthStart = previousMonth.atDay(1).atStartOfDay();
        LocalDateTime previousMonthEnd = previousMonth.atEndOfMonth().atTime(23, 59, 59);

        BigDecimal previousMonthNet = safeBigDecimal(earningRepository.sumNetAmountByInstructorIdAndDateRange(
                instructorId, previousMonthStart, previousMonthEnd));
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

        Page<InstructorEarning> earningsPage = earningRepository.findByInstructorIdAndDateRange(
                instructorId, start, end, pageable);

        return earningsPage.map(earningMapper::toResponse);
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

    @Override
    @Transactional(readOnly = true)
    public EarningsSummaryResponse getEarningsSummary(Long instructorId, LocalDate fromDate, LocalDate toDate) {
        // If dates are provided, filter the summary; otherwise use the default method
        if (fromDate != null || toDate != null) {
            LocalDate startDate = fromDate != null ? fromDate : LocalDate.of(2000, 1, 1);
            LocalDate endDate = toDate != null ? toDate : LocalDate.now();
            LocalDateTime start = startDate.atStartOfDay();
            LocalDateTime end = endDate.atTime(23, 59, 59);

            // Get filtered summary
            BigDecimal totalNet = safeBigDecimal(earningRepository.sumNetAmountByInstructorIdAndDateRange(instructorId, start, end));
            List<InstructorEarning> earnings = earningRepository.findByInstructorIdAndDateRange(instructorId, start, end);
            BigDecimal totalGross = earnings.stream()
                    .map(InstructorEarning::getGrossAmount)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            BigDecimal totalPlatformFees = totalGross.subtract(totalNet);

            BigDecimal pending = earnings.stream()
                    .filter(e -> e.getStatus() == EarningStatus.PENDING)
                    .map(InstructorEarning::getNetAmount)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            BigDecimal available = earnings.stream()
                    .filter(e -> e.getStatus() == EarningStatus.AVAILABLE)
                    .map(InstructorEarning::getNetAmount)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            BigDecimal paid = earnings.stream()
                    .filter(e -> e.getStatus() == EarningStatus.PAID)
                    .map(InstructorEarning::getNetAmount)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            long totalSales = earnings.size();

            return EarningsSummaryResponse.builder()
                    .instructorId(instructorId)
                    .totalGrossEarnings(totalGross)
                    .totalNetEarnings(totalNet)
                    .totalPlatformFees(totalPlatformFees)
                    .pendingEarnings(pending)
                    .availableEarnings(available)
                    .paidEarnings(paid)
                    .totalSales(totalSales)
                    .currency("USD")
                    .build();
        } else {
            return getEarningsSummary(instructorId);
        }
    }

    @Override
    @Transactional(readOnly = true)
    public Page<EarningResponse> getEarningsByInstructor(Long instructorId,
                                                         EarningStatus status,
                                                         Long courseId,
                                                         LocalDate fromDate,
                                                         LocalDate toDate,
                                                         Pageable pageable) {
        // Build query based on filters
        if (status != null && courseId != null) {
            // Filter by both status and course
            Page<InstructorEarning> earnings = earningRepository.findByInstructorIdAndStatusOrderByCreatedAtDesc(
                    instructorId, status, pageable);
            List<EarningResponse> filtered = earnings.stream()
                    .filter(e -> e.getCourseId().equals(courseId))
                    .filter(e -> {
                        if (fromDate != null && e.getCreatedAt().toLocalDate().isBefore(fromDate)) {
                            return false;
                        }
                        if (toDate != null && e.getCreatedAt().toLocalDate().isAfter(toDate)) {
                            return false;
                        }
                        return true;
                    })
                    .map(earningMapper::toResponse)
                    .collect(Collectors.toList());
            return new org.springframework.data.domain.PageImpl<>(filtered, pageable, filtered.size());
        } else if (status != null) {
            Page<InstructorEarning> earnings = earningRepository.findByInstructorIdAndStatusOrderByCreatedAtDesc(
                    instructorId, status, pageable);
            if (fromDate != null || toDate != null) {
                LocalDate start = fromDate != null ? fromDate : LocalDate.of(2000, 1, 1);
                LocalDate end = toDate != null ? toDate : LocalDate.now();
                List<EarningResponse> filtered = earnings.stream()
                        .filter(e -> {
                            LocalDate createdDate = e.getCreatedAt().toLocalDate();
                            return !createdDate.isBefore(start) && !createdDate.isAfter(end);
                        })
                        .map(earningMapper::toResponse)
                        .collect(Collectors.toList());
                return new org.springframework.data.domain.PageImpl<>(filtered, pageable, filtered.size());
            }
            return earnings.map(earningMapper::toResponse);
        } else if (fromDate != null || toDate != null) {
            LocalDate start = fromDate != null ? fromDate : LocalDate.of(2000, 1, 1);
            LocalDate end = toDate != null ? toDate : LocalDate.now();
            LocalDateTime startDateTime = start.atStartOfDay();
            LocalDateTime endDateTime = end.atTime(23, 59, 59);
            Page<InstructorEarning> earnings = earningRepository.findByInstructorIdAndDateRange(
                    instructorId, startDateTime, endDateTime, pageable);
            if (courseId != null) {
                List<EarningResponse> filtered = earnings.stream()
                        .filter(e -> e.getCourseId().equals(courseId))
                        .map(earningMapper::toResponse)
                        .collect(Collectors.toList());
                return new org.springframework.data.domain.PageImpl<>(filtered, pageable, filtered.size());
            }
            return earnings.map(earningMapper::toResponse);
        } else if (courseId != null) {
            // Filter by course only - need to fetch all and filter
            Page<InstructorEarning> earnings = earningRepository.findByInstructorIdOrderByCreatedAtDesc(
                    instructorId, pageable);
            List<EarningResponse> filtered = earnings.stream()
                    .filter(e -> e.getCourseId().equals(courseId))
                    .map(earningMapper::toResponse)
                    .collect(Collectors.toList());
            return new org.springframework.data.domain.PageImpl<>(filtered, pageable, filtered.size());
        } else {
            // No filters
            return getInstructorEarnings(instructorId, pageable);
        }
    }

    @Override
    @Transactional(readOnly = true)
    public List<MonthlyEarningResponse> getMonthlyEarnings(Long instructorId, int months) {
        List<MonthlyEarningResponse> monthlyEarnings = new ArrayList<>();
        YearMonth currentMonth = YearMonth.now();

        for (int i = 0; i < months; i++) {
            YearMonth month = currentMonth.minusMonths(i);
            LocalDateTime monthStart = month.atDay(1).atStartOfDay();
            LocalDateTime monthEnd = month.atEndOfMonth().atTime(23, 59, 59);

            List<InstructorEarning> earnings = earningRepository.findByInstructorIdAndDateRange(
                    instructorId, monthStart, monthEnd);

            BigDecimal grossEarnings = earnings.stream()
                    .map(InstructorEarning::getGrossAmount)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            BigDecimal netEarnings = earnings.stream()
                    .map(InstructorEarning::getNetAmount)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            BigDecimal platformFees = grossEarnings.subtract(netEarnings);
            int salesCount = earnings.size();

            String monthName = month.getMonth().name().substring(0, 1) +
                    month.getMonth().name().substring(1).toLowerCase() + " " + month.getYear();

            monthlyEarnings.add(MonthlyEarningResponse.builder()
                    .year(month.getYear())
                    .month(month.getMonthValue())
                    .monthName(monthName)
                    .grossEarnings(grossEarnings)
                    .netEarnings(netEarnings)
                    .platformFees(platformFees)
                    .salesCount(salesCount)
                    .currency("USD")
                    .build());
        }

        return monthlyEarnings;
    }

    @Override
    @Transactional(readOnly = true)
    public List<CourseEarningResponse> getEarningsByCourse(Long instructorId, LocalDate fromDate, LocalDate toDate) {
        LocalDateTime start = fromDate != null ? fromDate.atStartOfDay() : LocalDateTime.of(2000, 1, 1, 0, 0);
        LocalDateTime end = toDate != null ? toDate.atTime(23, 59, 59) : LocalDateTime.now();

        List<InstructorEarning> earnings = earningRepository.findByInstructorIdAndDateRange(instructorId, start, end);

        Map<Long, List<InstructorEarning>> earningsByCourse = earnings.stream()
                .collect(Collectors.groupingBy(InstructorEarning::getCourseId));

        return earningsByCourse.entrySet().stream()
                .map(entry -> {
                    Long courseId = entry.getKey();
                    List<InstructorEarning> courseEarnings = entry.getValue();

                    BigDecimal totalGross = courseEarnings.stream()
                            .map(InstructorEarning::getGrossAmount)
                            .reduce(BigDecimal.ZERO, BigDecimal::add);
                    BigDecimal totalNet = courseEarnings.stream()
                            .map(InstructorEarning::getNetAmount)
                            .reduce(BigDecimal.ZERO, BigDecimal::add);
                    long salesCount = courseEarnings.size();
                    BigDecimal averagePrice = salesCount > 0
                            ? totalGross.divide(BigDecimal.valueOf(salesCount), 2, RoundingMode.HALF_UP)
                            : BigDecimal.ZERO;

                    // Get course info from first earning
                    InstructorEarning firstEarning = courseEarnings.get(0);
                    String courseTitle = firstEarning.getOrderItem() != null
                            ? firstEarning.getOrderItem().getCourseTitle()
                            : "Unknown Course";
                    String courseThumbnail = firstEarning.getOrderItem() != null
                            ? firstEarning.getOrderItem().getCourseThumbnailUrl()
                            : null;

                    return CourseEarningResponse.builder()
                            .courseId(courseId)
                            .courseTitle(courseTitle)
                            .courseThumbnailUrl(courseThumbnail)
                            .totalGrossEarnings(totalGross)
                            .totalNetEarnings(totalNet)
                            .salesCount(salesCount)
                            .averageSalePrice(averagePrice)
                            .currency("USD")
                            .build();
                })
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public byte[] exportEarningsToCsv(Long instructorId, LocalDate fromDate, LocalDate toDate, EarningStatus status) {
        log.info("Exporting earnings to CSV for instructor: {}", instructorId);

        LocalDateTime start = fromDate != null ? fromDate.atStartOfDay() : LocalDateTime.of(2000, 1, 1, 0, 0);
        LocalDateTime end = toDate != null ? toDate.atTime(23, 59, 59) : LocalDateTime.now();

        List<InstructorEarning> earnings;
        if (status != null) {
            earnings = earningRepository.findByInstructorIdAndStatus(instructorId, status).stream()
                    .filter(e -> {
                        LocalDateTime createdAt = e.getCreatedAt();
                        return !createdAt.isBefore(start) && !createdAt.isAfter(end);
                    })
                    .collect(Collectors.toList());
        } else {
            earnings = earningRepository.findByInstructorIdAndDateRange(instructorId, start, end);
        }

        ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
        PrintWriter writer = new PrintWriter(outputStream);

        // Write CSV header
        writer.println("Date,Order Number,Course Title,Status,Gross Amount,Platform Fee,Net Amount,Currency");

        // Write CSV rows
        DateTimeFormatter dateFormatter = DateTimeFormatter.ofPattern("yyyy-MM-dd");
        for (InstructorEarning earning : earnings) {
            String date = earning.getCreatedAt().format(dateFormatter);
            String orderNumber = earning.getOrder() != null ? earning.getOrder().getOrderNumber() : "N/A";
            String courseTitle = earning.getOrderItem() != null
                    ? earning.getOrderItem().getCourseTitle().replace(",", ";")
                    : "N/A";
            String statusStr = earning.getStatus().name();
            String grossAmount = earning.getGrossAmount().toString();
            String platformFee = earning.getPlatformFeeAmount().toString();
            String netAmount = earning.getNetAmount().toString();
            String currency = earning.getCurrency() != null ? earning.getCurrency() : "USD";

            writer.printf("%s,%s,%s,%s,%s,%s,%s,%s%n",
                    date, orderNumber, courseTitle, statusStr, grossAmount, platformFee, netAmount, currency);
        }

        writer.flush();
        writer.close();

        return outputStream.toByteArray();
    }

    @Override
    @Transactional(readOnly = true)
    public EarningResponse getEarningByIdAndInstructor(Long earningId, Long instructorId) {
        InstructorEarning earning = earningRepository.findById(earningId)
                .orElseThrow(() -> new InstructorEarningNotFoundException(earningId));

        if (!earning.getInstructorId().equals(instructorId)) {
            throw new InstructorEarningNotFoundException(earningId);
        }

        return earningMapper.toResponse(earning);
    }

    private BigDecimal safeBigDecimal(BigDecimal value) {
        return value != null ? value : BigDecimal.ZERO;
    }
}

