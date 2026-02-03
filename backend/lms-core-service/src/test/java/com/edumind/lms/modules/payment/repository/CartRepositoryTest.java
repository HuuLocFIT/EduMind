package com.edumind.lms.modules.payment.repository;

import com.edumind.lms.config.BaseRepositoryTest;
import com.edumind.lms.modules.payment.PaymentTestHelper;
import com.edumind.lms.modules.payment.entity.Cart;
import com.edumind.lms.modules.payment.entity.CartItem;

import org.assertj.core.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.dao.DataIntegrityViolationException;

import java.math.BigDecimal;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Repository tests for CartRepository.
 * Uses Testcontainers with real PostgreSQL.
 */
@DisplayName("CartRepository Tests")
class CartRepositoryTest extends BaseRepositoryTest {

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
        Optional<Cart> found = cartRepository.findByUserId(PaymentTestHelper.NON_EXISTENT_USER_ID);

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
        assertThat(cartRepository.existsByUserId(PaymentTestHelper.NON_EXISTENT_USER_ID)).isFalse();
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
        int missingCount = cartRepository.countItemsByUserId(PaymentTestHelper.NON_EXISTENT_USER_ID);
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

    @Test
    @DisplayName("Should throw exception when saving duplicate cart for same user")
    void save_DuplicateUserId_ShouldThrowException() {
        // Given
        Cart cart1 = PaymentTestHelper.createCart(userId);
        entityManager.persist(cart1);
        entityManager.flush();

        Cart cart2 = PaymentTestHelper.createCart(userId);

        // When & Then
        Assertions.assertThatThrownBy(() -> {
            cartRepository.save(cart2);
            entityManager.flush();
        }).isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    @DisplayName("Should return cart with empty items list when no items exist")
    void findByUserIdWithItems_EmptyCart_ShouldReturnEmptyItemsList() {
        // Given
        Cart cart = PaymentTestHelper.createCart(userId);
        entityManager.persist(cart);
        entityManager.flush();
        entityManager.clear();

        // When
        Optional<Cart> result = cartRepository.findByUserIdWithItems(userId);

        // Then
        assertThat(result).isPresent();
        assertThat(result.get().getItems()).isNotNull();
        assertThat(result.get().getItems()).isEmpty();
    }

    @Test
    @DisplayName("Should return cart with empty items list when fetching by ID with no items")
    void findByIdWithItems_EmptyCart_ShouldReturnEmptyItemsList() {
        // Given
        Cart cart = PaymentTestHelper.createCart(userId);
        cart = entityManager.persist(cart);
        entityManager.flush();
        entityManager.clear();

        // When
        Optional<Cart> result = cartRepository.findByIdWithItems(cart.getId());

        // Then
        assertThat(result).isPresent();
        assertThat(result.get().getItems()).isNotNull();
        assertThat(result.get().getItems()).isEmpty();
    }

    @Test
    @DisplayName("Should return empty when findByIdWithItems with non-existent ID")
    void findByIdWithItems_NonExistentId_ShouldReturnEmpty() {
        // When
        Optional<Cart> result = cartRepository.findByIdWithItems(PaymentTestHelper.NON_EXISTENT_CART_ID);

        // Then
        assertThat(result).isEmpty();
    }
}
