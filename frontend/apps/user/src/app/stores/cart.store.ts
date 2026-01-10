import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartItemResponse } from "@edumind/shared-types";

interface CartState {
  // State
  items: CartItemResponse[];
  itemCount: number;
  totalAmount: number;
  currency: string;
  isOpen: boolean; // Cart drawer/modal open state

  // Optimistic UI tracking
  pendingAdditions: number[]; // courseIds being added
  pendingRemovals: number[]; // courseIds being removed

  // Actions
  setCart: (items: CartItemResponse[], totalAmount: number, currency: string) => void;
  setItemCount: (count: number) => void;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;

  // Optimistic updates
  startAddingItem: (courseId: number) => void;
  finishAddingItem: (courseId: number) => void;
  startRemovingItem: (courseId: number) => void;
  finishRemovingItem: (courseId: number) => void;

  // Check if item is in cart (locally)
  isItemInCart: (courseId: number) => boolean;
  isItemPending: (courseId: number) => boolean;

  // Clear cart (after checkout)
  clearCart: () => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      // Initial state
      items: [],
      itemCount: 0,
      totalAmount: 0,
      currency: "USD",
      isOpen: false,
      pendingAdditions: [],
      pendingRemovals: [],

      // Actions
      setCart: (items, totalAmount, currency) =>
        set({
          items,
          itemCount: items.length,
          totalAmount,
          currency,
        }),

      setItemCount: (count) => set({ itemCount: count }),

      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),
      toggleCart: () => set((state) => ({ isOpen: !state.isOpen })),

      // Optimistic updates
      startAddingItem: (courseId) =>
        set((state) => ({
          pendingAdditions: [...state.pendingAdditions, courseId],
          itemCount: state.itemCount + 1, // Optimistic count update
        })),

      finishAddingItem: (courseId) =>
        set((state) => ({
          pendingAdditions: state.pendingAdditions.filter((id) => id !== courseId),
        })),

      startRemovingItem: (courseId) =>
        set((state) => ({
          pendingRemovals: [...state.pendingRemovals, courseId],
          itemCount: Math.max(0, state.itemCount - 1), // Optimistic count update
        })),

      finishRemovingItem: (courseId) =>
        set((state) => ({
          pendingRemovals: state.pendingRemovals.filter((id) => id !== courseId),
        })),

      isItemInCart: (courseId) => {
        const { items, pendingAdditions, pendingRemovals } = get();
        const inItems = items.some((item) => item.courseId === courseId);
        const beingAdded = pendingAdditions.includes(courseId);
        const beingRemoved = pendingRemovals.includes(courseId);

        // In cart if: (in items and not being removed) or (being added)
        return (inItems && !beingRemoved) || beingAdded;
      },

      isItemPending: (courseId) => {
        const { pendingAdditions, pendingRemovals } = get();
        return pendingAdditions.includes(courseId) || pendingRemovals.includes(courseId);
      },

      clearCart: () =>
        set({
          items: [],
          itemCount: 0,
          totalAmount: 0,
          pendingAdditions: [],
          pendingRemovals: [],
        }),
    }),
    {
      name: "cart-storage",
      partialize: (state) => ({
        itemCount: state.itemCount,
        // Don't persist items to avoid stale data - fetch from server
      }),
    }
  )
);
