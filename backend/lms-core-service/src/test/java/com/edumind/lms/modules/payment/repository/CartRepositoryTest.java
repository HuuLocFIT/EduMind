package com.edumind.lms.modules.payment.repository;

import com.edumind.lms.modules.payment.PaymentTestHelper;
import com.edumind.lms.modules.payment.entity.Cart;
import com.edumind.lms.modules.payment.entity.CartItem;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import com.edumind.lms.config.JpaAuditingConfig;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;

import java.math.BigDecimal;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@ActiveProfiles("test")
@Import(JpaAuditingConfig.class)
@DisplayName("CartRepository Tests")
class CartRepositoryTest {

    @Autowired
    private CartRepository cartRepository;

    @Autowired
    private TestEntityManager entityManager;

    private Long userId = 101L;

    @BeforeEach
    void setUp() {
        entityManager.clear();
    }

    @Test
    @DisplayName("Should find cart by userId")
    void findByUserId_WhenExists_ShouldReturnCart() {
        // Given
        Cart cart = PaymentTestHelper.createCart(userId);
        entityManager.persist(cart);
        entityManager.flush();

        // When
        Optional<Cart> found = cartRepository.findByUserId(userId);

        // Then
        assertThat(found).isPresent();
        assertThat(found.get().getUserId()).isEqualTo(userId);
    }

    @Test
    @DisplayName("Should return empty when cart not found by userId")
    void findByUserId_WhenNotExists_ShouldReturnEmpty() {
        // When
        Optional<Cart> found = cartRepository.findByUserId(999L);

        // Then
        assertThat(found).isEmpty();
    }

    @Test
    @DisplayName("Should check if cart exists by userId")
    void existsByUserId_ShouldReturnCorrectStatus() {
        // Given
        Cart cart = PaymentTestHelper.createCart(userId);
        entityManager.persist(cart);
        entityManager.flush();

        // When/Then
        assertThat(cartRepository.existsByUserId(userId)).isTrue();
        assertThat(cartRepository.existsByUserId(999L)).isFalse();
    }

    @Test
    @DisplayName("Should find cart with items by userId")
    void findByUserIdWithItems_ShouldFetchItemsWithType() {
        // Given
        Cart cart = PaymentTestHelper.createCart(userId);
        entityManager.persist(cart);

        CartItem item1 = PaymentTestHelper.createCartItem(201L, new BigDecimal("49.99"));
        cart.addItem(item1); // Helper sets bidirectional relationship
        
        CartItem item2 = PaymentTestHelper.createCartItem(202L, new BigDecimal("29.99"));
        cart.addItem(item2);

        entityManager.persist(cart); // Cascades to items
        entityManager.flush();
        entityManager.clear(); // Clear L1 cache to force query

        // When
        Optional<Cart> result = cartRepository.findByUserIdWithItems(userId);

        // Then
        assertThat(result).isPresent();
        assertThat(result.get().getItems()).hasSize(2);
        assertThat(result.get().getItems())
                .extracting(CartItem::getCourseId)
                .containsExactlyInAnyOrder(201L, 202L);
    }

    @Test
    @DisplayName("Should count items in cart accurately")
    void countItemsByUserId_ShouldReturnCount() {
        // Given
        Cart cart = PaymentTestHelper.createCart(userId);
        CartItem item1 = PaymentTestHelper.createCartItem(201L, new BigDecimal("10.00"));
        CartItem item2 = PaymentTestHelper.createCartItem(202L, new BigDecimal("20.00"));
        cart.addItem(item1);
        cart.addItem(item2);

        entityManager.persist(cart);
        entityManager.flush();

        // When
        int count = cartRepository.countItemsByUserId(userId);

        // Then
        assertThat(count).isEqualTo(2);
    }

    @Test
    @DisplayName("Should return 0 items count when cart empty or missing")
    void countItemsByUserId_WhenEmpty_ShouldReturnZero() {
        // Given (Cart exists but empty)
        Cart cart = PaymentTestHelper.createCart(userId);
        entityManager.persist(cart);
        entityManager.flush();

        // When
        int count = cartRepository.countItemsByUserId(userId);

        // Then
        assertThat(count).isZero();

        // When (No cart)
        int missingCount = cartRepository.countItemsByUserId(999L);
        assertThat(missingCount).isZero();
    }

    @Test
    @DisplayName("Should findByIdWithItems")
    void findByIdWithItems_ShouldFetchItems() {
        // Given
        Cart cart = PaymentTestHelper.createCart(userId);
        CartItem item = PaymentTestHelper.createCartItem(201L, new BigDecimal("99.00"));
        cart.addItem(item);
        
        cart = entityManager.persist(cart);
        entityManager.flush();
        entityManager.clear();

        // When
        Optional<Cart> result = cartRepository.findByIdWithItems(cart.getId());

        // Then
        assertThat(result).isPresent();
        assertThat(result.get().getItems()).hasSize(1);
    }
}
