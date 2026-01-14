import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useCartStore } from './cart.store';

describe('cart.store', () => {
  beforeEach(() => {
    // Reset store state mostly by calling actions or creating a fresh state if possible.
    // Since zustand stores are global, we manually reset via provided action if exists, 
    // or by calling setState directly if exposed.
    // Our store has a `clearCart` but we might want stronger reset.
    // We can use `setState` on the store itself.
    useCartStore.setState({
      items: [],
      itemCount: 0,
      totalAmount: 0,
      currency: "USD",
      isOpen: false,
      pendingAdditions: [],
      pendingRemovals: [],
    });
  });

  it('should initialize with default state', () => {
    const state = useCartStore.getState();
    expect(state.items).toEqual([]);
    expect(state.itemCount).toBe(0);
    expect(state.pendingAdditions).toEqual([]);
    expect(state.pendingRemovals).toEqual([]);
    expect(state.isOpen).toBe(false);
  });

  it('should update cart data via setCart', () => {
    const mockItems: any[] = [{ courseId: 1, title: 'Test Item' }];
    useCartStore.getState().setCart(mockItems, 100, 'EUR');

    const state = useCartStore.getState();
    expect(state.items).toEqual(mockItems);
    expect(state.itemCount).toBe(1);
    expect(state.totalAmount).toBe(100);
    expect(state.currency).toBe('EUR');
  });

  it('should toggle isOpen state', () => {
    expect(useCartStore.getState().isOpen).toBe(false);
    
    useCartStore.getState().openCart();
    expect(useCartStore.getState().isOpen).toBe(true);
    
    useCartStore.getState().closeCart();
    expect(useCartStore.getState().isOpen).toBe(false);
    
    useCartStore.getState().toggleCart();
    expect(useCartStore.getState().isOpen).toBe(true);
  });

  it('should handle optimistic adding of items', () => {
    useCartStore.getState().startAddingItem(100);
    
    let state = useCartStore.getState();
    expect(state.pendingAdditions).toContain(100);
    expect(state.itemCount).toBe(1); // Optimistic increment
    
    // Check isItemInCart logic during addition
    expect(state.isItemInCart(100)).toBe(true);
    expect(state.isItemPending(100)).toBe(true);

    useCartStore.getState().finishAddingItem(100);
    
    state = useCartStore.getState();
    expect(state.pendingAdditions).not.toContain(100);
    // Note: itemCount doesn't auto-decrement on finish, it assumes refetch/setCart will follow
    // or previous state remains valid until refresh. 
    // But normally finishAdding is called. 
    // The implementation of finishAdding only removes from pendingAdditions.
  });

  it('should handle optimistic removal of items', () => {
    // Setup initial state
    useCartStore.getState().setCart([{ courseId: 200 } as any], 50, 'USD');
    expect(useCartStore.getState().items.length).toBe(1);
    expect(useCartStore.getState().itemCount).toBe(1);

    // Start removing
    useCartStore.getState().startRemovingItem(200);
    
    let state = useCartStore.getState();
    expect(state.pendingRemovals).toContain(200);
    expect(state.itemCount).toBe(0); // Optimistic decrement
    
    // Check isItemInCart logic during removal (should be false)
    expect(state.isItemInCart(200)).toBe(false);
    expect(state.isItemPending(200)).toBe(true);

    // Finish removing
    useCartStore.getState().finishRemovingItem(200);
    
    state = useCartStore.getState();
    expect(state.pendingRemovals).not.toContain(200);
  });

  it('should clear cart fully', () => {
    useCartStore.setState({
      items: [{ courseId: 1 }] as any,
      itemCount: 1,
      totalAmount: 10,
      pendingAdditions: [2],
      pendingRemovals: [3]
    });

    useCartStore.getState().clearCart();

    const state = useCartStore.getState();
    expect(state.items).toEqual([]);
    expect(state.itemCount).toBe(0);
    expect(state.totalAmount).toBe(0);
    expect(state.pendingAdditions).toEqual([]);
    expect(state.pendingRemovals).toEqual([]);
  });

  it('should correctly determine isItemInCart', () => {
    useCartStore.setState({
      items: [{ courseId: 10 }] as any,
      pendingAdditions: [20],
      pendingRemovals: [10],
    });

    const { isItemInCart } = useCartStore.getState();

    expect(isItemInCart(10)).toBe(false); // In items but pending removal -> False
    expect(isItemInCart(20)).toBe(true);  // Pending addition -> True
    expect(isItemInCart(30)).toBe(false); // Neither -> False
  });
});
