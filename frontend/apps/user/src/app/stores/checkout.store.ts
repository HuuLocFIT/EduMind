import { create } from "zustand";
import type { PaymentMethod } from "@edumind/shared-constants";
import type { CheckoutItemPreview } from "@edumind/shared-types";

export type CheckoutStep = "cart" | "payment" | "processing" | "success" | "failed";
export type CheckoutMode = "cart" | "direct"; // cart checkout or buy-now

interface CheckoutState {
  // Flow state
  mode: CheckoutMode;
  currentStep: CheckoutStep;
  courseId: number | null; // For direct checkout

  // Payment selection
  selectedPaymentMethod: PaymentMethod | null;

  // Customer info (populated from user or form)
  customerEmail: string;
  customerName: string;
  billingAddress: string;

  // Card details (for mock gateway)
  cardNumber: string;
  cardHolderName: string;
  expiryDate: string;
  cvv: string;

  // Return URLs
  successUrl: string;
  cancelUrl: string;

  // Result
  orderNumber: string | null;
  redirectUrl: string | null;
  errorMessage: string | null;

  // Actions
  startCartCheckout: () => void;
  startDirectCheckout: (courseId: number) => void;
  setStep: (step: CheckoutStep) => void;
  setPaymentMethod: (method: PaymentMethod) => void;
  setCustomerInfo: (info: { email?: string; name?: string; address?: string }) => void;
  setCardDetails: (details: {
    cardNumber?: string;
    cardHolderName?: string;
    expiryDate?: string;
    cvv?: string;
  }) => void;
  setReturnUrls: (urls: { successUrl?: string; cancelUrl?: string }) => void;
  setResult: (result: {
    orderNumber?: string;
    redirectUrl?: string;
    errorMessage?: string;
  }) => void;
  reset: () => void;
}

const initialState = {
  mode: "cart" as CheckoutMode,
  currentStep: "cart" as CheckoutStep,
  courseId: null,
  selectedPaymentMethod: null,
  customerEmail: "",
  customerName: "",
  billingAddress: "",
  cardNumber: "",
  cardHolderName: "",
  expiryDate: "",
  cvv: "",
  successUrl: "",
  cancelUrl: "",
  orderNumber: null,
  redirectUrl: null,
  errorMessage: null,
};

export const useCheckoutStore = create<CheckoutState>()((set) => ({
  ...initialState,

  // Actions
  startCartCheckout: () =>
    set({
      ...initialState,
      mode: "cart",
      currentStep: "payment",
    }),

  startDirectCheckout: (courseId) =>
    set({
      ...initialState,
      mode: "direct",
      courseId,
      currentStep: "payment",
    }),

  setStep: (step) => set({ currentStep: step }),

  setPaymentMethod: (method) => set({ selectedPaymentMethod: method }),

  setCustomerInfo: (info) =>
    set((state) => ({
      customerEmail: info.email ?? state.customerEmail,
      customerName: info.name ?? state.customerName,
      billingAddress: info.address ?? state.billingAddress,
    })),

  setCardDetails: (details) =>
    set((state) => ({
      cardNumber: details.cardNumber ?? state.cardNumber,
      cardHolderName: details.cardHolderName ?? state.cardHolderName,
      expiryDate: details.expiryDate ?? state.expiryDate,
      cvv: details.cvv ?? state.cvv,
    })),

  setReturnUrls: (urls) =>
    set((state) => ({
      successUrl: urls.successUrl ?? state.successUrl,
      cancelUrl: urls.cancelUrl ?? state.cancelUrl,
    })),

  setResult: (result) =>
    set((state) => ({
      orderNumber: result.orderNumber ?? state.orderNumber,
      redirectUrl: result.redirectUrl ?? state.redirectUrl,
      errorMessage: result.errorMessage ?? state.errorMessage,
    })),

  reset: () => set(initialState),
}));
