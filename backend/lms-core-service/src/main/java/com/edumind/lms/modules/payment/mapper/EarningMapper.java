package com.edumind.lms.modules.payment.mapper;

import com.edumind.lms.modules.payment.dto.response.EarningResponse;
import com.edumind.lms.modules.payment.entity.InstructorEarning;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.stream.Collectors;

@Component
public class EarningMapper {

    public EarningResponse toResponse(InstructorEarning earning) {
        return EarningResponse.builder()
                .id(earning.getId())
                .instructorId(earning.getInstructorId())
                .orderId(earning.getOrder().getId())
                .orderNumber(earning.getOrder().getOrderNumber())
                .courseId(earning.getCourseId())
                .courseTitle(earning.getOrderItem().getCourseTitle())
                .courseThumbnailUrl(earning.getOrderItem().getCourseThumbnailUrl())
                .grossAmount(earning.getGrossAmount())
                .platformFeePercent(earning.getPlatformFeePercent())
                .platformFeeAmount(earning.getPlatformFeeAmount())
                .netAmount(earning.getNetAmount())
                .currency(earning.getCurrency())
                .status(earning.getStatus())
                .payoutId(earning.getPayoutId())
                .paidAt(earning.getPaidAt())
                .createdAt(earning.getCreatedAt())
                .build();
    }

    public EarningResponse toResponseWithBuyer(InstructorEarning earning, String buyerName) {
        EarningResponse response = toResponse(earning);
        response.setBuyerName(anonymizeName(buyerName));
        return response;
    }

    public List<EarningResponse> toResponseList(List<InstructorEarning> earnings) {
        return earnings.stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    /**
     * Anonymize buyer name for privacy
     * "John Doe" -> "John D."
     */
    private String anonymizeName(String fullName) {
        if (fullName == null || fullName.isBlank()) {
            return "Anonymous";
        }

        String[] parts = fullName.trim().split("\\s+");
        if (parts.length == 1) {
            return parts[0];
        }

        return parts[0] + " " + parts[parts.length - 1].charAt(0) + ".";
    }
}
