package com.edumind.lms.modules.payment.repository;

import com.edumind.lms.modules.payment.entity.PayoutItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.Set;

@Repository
public interface PayoutItemRepository extends JpaRepository<PayoutItem, Long> {

    // Find all items for a payout
    List<PayoutItem> findByPayoutId(Long payoutId);

    // Find all items for a payout with eagerly loaded earning chain (avoids N+1)
    @Query("SELECT pi FROM PayoutItem pi " +
            "JOIN FETCH pi.earning e " +
            "JOIN FETCH e.order " +
            "LEFT JOIN FETCH e.orderItem " +
            "WHERE pi.payout.id = :payoutId")
    List<PayoutItem> findByPayoutIdWithEarnings(@Param("payoutId") Long payoutId);

    // Find by earning ID
    Optional<PayoutItem> findByEarningId(Long earningId);

    // Check if earning is already in a payout
    boolean existsByEarningId(Long earningId);

    // Batch check: find earning IDs that are already in payouts (avoids N+1 existsByEarningId calls)
    @Query("SELECT pi.earning.id FROM PayoutItem pi WHERE pi.earning.id IN :earningIds")
    Set<Long> findEarningIdsByEarningIdIn(@Param("earningIds") List<Long> earningIds);
}
