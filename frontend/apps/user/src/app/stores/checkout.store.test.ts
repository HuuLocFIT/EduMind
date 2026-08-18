import { describe, it, expect, beforeEach } from 'vitest';
import { useCheckoutStore } from './checkout.store';
import { PaymentMethod } from '@edumind/shared-constants';

describe('checkout.store', () => {
  beforeEach(() => {
    // Reset to default
    useCheckoutStore.getState().reset();
  });

  it('should initialize with default state', () => {
    const state = useCheckoutStore.getState();
    expect(state.mode).toBe('cart');
    expect(state.currentStep).toBe('cart');
    expect(state.courseId).toBeNull();
    expect(state.selectedPaymentMethod).toBeNull();
    expect(state.customerEmail).toBe('');
    expect(state.cardNumber).toBe('');
  });

  it('handle initializing Cart Checkout flow', () => {
    useCheckoutStore.getState().startCartCheckout();
    const state = useCheckoutStore.getState();
    expect(state.mode).toBe('cart');
    expect(state.currentStep).toBe('payment');
    expect(state.courseId).toBeNull(); // Should reset courseId
  });

  it('handle initializing Direct Checkout flow', () => {
    useCheckoutStore.getState().startDirectCheckout(999);
    const state = useCheckoutStore.getState();
    expect(state.mode).toBe('direct');
    expect(state.currentStep).toBe('payment');
    expect(state.courseId).toBe(999);
  });

  it('should update step', () => {
    useCheckoutStore.getState().setStep('processing');
    expect(useCheckoutStore.getState().currentStep).toBe('processing');
  });

  it('should update payment method', () => {
    useCheckoutStore.getState().setPaymentMethod(PaymentMethod.SEPAY);
    expect(useCheckoutStore.getState().selectedPaymentMethod).toBe(PaymentMethod.SEPAY);
  });

  it('should partial update customer info', () => {
    useCheckoutStore.getState().setCustomerInfo({ email: 'test@example.com' });
    expect(useCheckoutStore.getState().customerEmail).toBe('test@example.com');
    // others empty
    
    useCheckoutStore.getState().setCustomerInfo({ name: 'John Doe' });
    expect(useCheckoutStore.getState().customerName).toBe('John Doe');
    expect(useCheckoutStore.getState().customerEmail).toBe('test@example.com'); // Persisted previous
  });

  it('should partial update card details', () => {
    useCheckoutStore.getState().setCardDetails({ cardNumber: '1234' });
    expect(useCheckoutStore.getState().cardNumber).toBe('1234');
    
    useCheckoutStore.getState().setCardDetails({ cvv: '123' });
    expect(useCheckoutStore.getState().cvv).toBe('123');
    expect(useCheckoutStore.getState().cardNumber).toBe('1234'); // Persisted previous
  });

  it('should update return urls', () => {
    useCheckoutStore.getState().setReturnUrls({ successUrl: '/success', cancelUrl: '/cancel' });
    expect(useCheckoutStore.getState().successUrl).toBe('/success');
    expect(useCheckoutStore.getState().cancelUrl).toBe('/cancel');
  });

  it('should update result', () => {
    useCheckoutStore.getState().setResult({ orderNumber: 'ORD-123' });
    expect(useCheckoutStore.getState().orderNumber).toBe('ORD-123');
    expect(useCheckoutStore.getState().errorMessage).toBeNull();

    useCheckoutStore.getState().setResult({ errorMessage: 'Failed' });
    expect(useCheckoutStore.getState().errorMessage).toBe('Failed');
    expect(useCheckoutStore.getState().orderNumber).toBe('ORD-123'); // Persisted previous
  });

  it('should reset store', () => {
    useCheckoutStore.getState().setPaymentMethod(PaymentMethod.PAYPAL);
    useCheckoutStore.getState().setStep('success');
    useCheckoutStore.getState().setResult({ orderNumber: 'ORD-123' });

    useCheckoutStore.getState().reset();

    const state = useCheckoutStore.getState();
    expect(state.currentStep).toBe('cart');
    expect(state.orderNumber).toBeNull();
  });

  it('should preserve selected payment method across reset (avoid redundant re-selection)', () => {
    useCheckoutStore.getState().setPaymentMethod(PaymentMethod.SEPAY);

    useCheckoutStore.getState().reset();

    expect(useCheckoutStore.getState().selectedPaymentMethod).toBe(PaymentMethod.SEPAY);
  });
});
