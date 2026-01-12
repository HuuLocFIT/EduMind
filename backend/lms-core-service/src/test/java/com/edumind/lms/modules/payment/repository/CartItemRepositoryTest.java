package com.edumind.lms.modules.payment.repository;

import com.edumind.lms.config.JpaAuditingConfig;
import com.edumind.lms.modules.payment.PaymentTestHelper;
import com.edumind.lms.modules.payment.entity.Cart;
import com.edumind.lms.modules.payment.entity.CartItem;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@ActiveProfiles("test")
@Import(JpaAuditingConfig.class)
@DisplayName("CartItemRepository Tests")
class CartItemRepositoryTest {

    @Autowired
    private CartItemRepository cartItemRepository;

    @Autowired
    private TestEntityManager entityManager;

    private Cart cart;
    private Long courseId1 = 100L;
    private Long courseId2 = 200L;

    @BeforeEach
    void setUp() {
        entityManager.clear();
        cart = PaymentTestHelper.createCart(1L);
        entityManager.persist(cart);
    }

    @Test
    @DisplayName("Should find cart item by cart ID and course ID")
    void findByCartIdAndCourseId_ShouldReturnItem() {
        // Given
        CartItem item = PaymentTestHelper.createCartItem(courseId1, new BigDecimal("99.99"));
        cart.addItem(item);
        entityManager.persist(item);
        entityManager.flush();

        // When
        Optional<CartItem> found = cartItemRepository.findByCartIdAndCourseId(cart.getId(), courseId1);

        // Then
        assertThat(found).isPresent();
        assertThat(found.get().getCourseId()).isEqualTo(courseId1);
    }

    @Test
    @DisplayName("Should check if cart item exists by cart ID and course ID")
    void existsByCartIdAndCourseId_ShouldReturnTrue() {
        // Given
        CartItem item = PaymentTestHelper.createCartItem(courseId1, new BigDecimal("99.99"));
        cart.addItem(item);
        entityManager.persist(item);
        entityManager.flush();

        // When & Then
        assertThat(cartItemRepository.existsByCartIdAndCourseId(cart.getId(), courseId1)).isTrue();
        assertThat(cartItemRepository.existsByCartIdAndCourseId(cart.getId(), 999L)).isFalse();
    }

    @Test
    @DisplayName("Should delete cart item by cart ID and course ID")
    void deleteByCartIdAndCourseId_ShouldRemoveItem() {
        // Given
        CartItem item1 = PaymentTestHelper.createCartItem(courseId1, new BigDecimal("99.99"));
        CartItem item2 = PaymentTestHelper.createCartItem(courseId2, new BigDecimal("49.99"));
        cart.addItem(item1);
        cart.addItem(item2);
        entityManager.persist(item1);
        entityManager.persist(item2);
        entityManager.flush();

        // When
        cartItemRepository.deleteByCartIdAndCourseId(cart.getId(), courseId1);
        entityManager.flush();
        entityManager.clear();

        // Then
        assertThat(cartItemRepository.existsByCartIdAndCourseId(cart.getId(), courseId1)).isFalse();
        assertThat(cartItemRepository.existsByCartIdAndCourseId(cart.getId(), courseId2)).isTrue();
    }

    @Test
    @DisplayName("Should delete all cart items by cart ID")
    void deleteAllByCartId_ShouldRemoveAllItems() {
        // Given
        CartItem item1 = PaymentTestHelper.createCartItem(courseId1, new BigDecimal("99.99"));
        CartItem item2 = PaymentTestHelper.createCartItem(courseId2, new BigDecimal("49.99"));
        cart.addItem(item1);
        cart.addItem(item2);
        entityManager.persist(item1);
        entityManager.persist(item2);
        entityManager.flush();

        // When
        cartItemRepository.deleteAllByCartId(cart.getId());
        entityManager.flush();
        entityManager.clear();

        // Then
        assertThat(cartItemRepository.countByCartId(cart.getId())).isZero();
    }

    @Test
    @DisplayName("Should find course IDs by user ID")
    void findCourseIdsByUserId_ShouldReturnCourseIds() {
        // Given
        CartItem item1 = PaymentTestHelper.createCartItem(courseId1, new BigDecimal("99.99"));
        CartItem item2 = PaymentTestHelper.createCartItem(courseId2, new BigDecimal("49.99"));
        cart.addItem(item1);
        cart.addItem(item2);
        entityManager.persist(item1);
        entityManager.persist(item2);
        entityManager.flush();

        // When
        List<Long> courseIds = cartItemRepository.findCourseIdsByUserId(cart.getUserId());

        // Then
        assertThat(courseIds).hasSize(2).containsExactlyInAnyOrder(courseId1, courseId2);
    }

    @Test
    @DisplayName("Should count items by cart ID")
    void countByCartId_ShouldReturnCorrectCount() {
        // Given
        CartItem item1 = PaymentTestHelper.createCartItem(courseId1, new BigDecimal("99.99"));
        CartItem item2 = PaymentTestHelper.createCartItem(courseId2, new BigDecimal("49.99"));
        cart.addItem(item1);
        cart.addItem(item2);
        entityManager.persist(item1);
        entityManager.persist(item2);
        entityManager.flush();

        // When
        int count = cartItemRepository.countByCartId(cart.getId());

        // Then
        assertThat(count).isEqualTo(2);
    }
}
