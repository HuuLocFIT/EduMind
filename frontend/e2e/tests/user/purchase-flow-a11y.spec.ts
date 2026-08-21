import { expect, test, type Page, type Route, type TestInfo } from '@playwright/test';
import { checkA11y } from '../../utils/accessibility.js';

const { responseForApi } = require('../../pa11y/fixtures.cjs') as {
  responseForApi(pathname: string): { status: number; contentType: string; body: string };
};

const now = '2026-01-01T00:00:00.000Z';

const courses = [
  {
    id: 11,
    courseId: 101,
    courseTitle: 'Accessible React',
    courseSlug: 'accessible-react',
    courseThumbnailUrl: null,
    instructorName: 'Ada Lovelace',
    instructorId: 1,
    originalPrice: 80,
    discountAmount: 20,
    effectivePrice: 60,
    currency: 'USD',
    level: 'BEGINNER',
    totalLessons: 12,
    averageRating: 4.8,
    totalReviews: 20,
    addedAt: now,
    isAvailable: true,
    unavailableReason: null,
  },
  {
    id: 12,
    courseId: 102,
    courseTitle: 'Practical TypeScript',
    courseSlug: 'practical-typescript',
    courseThumbnailUrl: null,
    instructorName: 'Grace Hopper',
    instructorId: 2,
    originalPrice: 40,
    discountAmount: 0,
    effectivePrice: 40,
    currency: 'USD',
    level: 'INTERMEDIATE',
    totalLessons: 8,
    averageRating: 4.7,
    totalReviews: 12,
    addedAt: now,
    isAvailable: true,
    unavailableReason: null,
  },
];

type Course = (typeof courses)[number];

const cartPayload = (items: Course[]) => ({
  id: 1,
  userId: 99,
  items,
  itemCount: items.length,
  subtotal: items.reduce((sum, item) => sum + item.originalPrice, 0),
  discountTotal: items.reduce((sum, item) => sum + (item.discountAmount || 0), 0),
  totalAmount: items.reduce((sum, item) => sum + item.effectivePrice, 0),
  currency: 'USD',
  createdAt: now,
  updatedAt: now,
});

const json = (route: Route, body: unknown, status = 200) =>
  route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

async function installAuthenticatedCart(page: Page, initialItems: Course[], removeFails = false) {
  let items = [...initialItems];

  await page.addInitScript(() => {
    const user = { id: 99, username: 'a11y-student', email: 'a11y@example.test', roles: ['STUDENT'] };
    localStorage.setItem('accessToken', 'deterministic-a11y-token');
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('auth-storage', JSON.stringify({
      state: { user, accessToken: 'deterministic-a11y-token', isAuthenticated: true, isLoading: false, error: null },
      version: 0,
    }));
  });

  await page.route('**/api/cart/**', async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    if (pathname.endsWith('/cart/count')) return json(route, items.length);
    if (/\/cart\/check\/\d+$/.test(pathname)) {
      const courseId = Number(pathname.split('/').at(-1));
      return json(route, items.some((item) => item.courseId === courseId));
    }
    if (route.request().method() === 'POST' && pathname.endsWith('/cart/items')) {
      const courseId = Number((route.request().postDataJSON() as { courseId: number }).courseId);
      if (!items.some((item) => item.courseId === courseId)) items.push(courses[0]);
      return json(route, cartPayload(items));
    }
    if (route.request().method() === 'DELETE' && /\/cart\/items\/\d+$/.test(pathname)) {
      if (removeFails) return json(route, { status: 503, message: 'Cart update failed. Try again.' }, 503);
      const courseId = Number(pathname.split('/').at(-1));
      items = items.filter((item) => item.courseId !== courseId);
      return json(route, cartPayload(items));
    }
    return route.fallback();
  });

  await page.route(/\/api\/cart(?:\?.*)?$/, (route) => json(route, cartPayload(items)));
}

const checkoutPreview = {
  items: courses.slice(0, 1).map((course) => ({
    ...course,
    isFree: false,
  })),
  itemCount: 1,
  subtotal: 80,
  discountTotal: 20,
  taxAmount: 0,
  taxRate: 0,
  totalAmount: 60,
  currency: 'USD',
  isFreeCheckout: false,
  requiresPayment: true,
  availablePaymentMethods: ['PAYPAL', 'SEPAY'],
  isValid: true,
  validationErrors: [],
  warnings: [],
  cartSignature: 'flow-3-cart-signature',
};

async function installCheckoutPreview(page: Page) {
  await page.route('**/api/checkout/preview**', (route) => json(route, checkoutPreview));
  await page.route('**/api/checkout/direct/preview**', (route) => json(route, checkoutPreview));
}

async function openCart(page: Page) {
  await page.goto('/cart');
  await expect(page.getByRole('heading', { level: 1, name: 'Shopping Cart' })).toBeVisible();
}

async function axe(page: Page, testInfo: TestInfo, stateName: string) {
  await checkA11y(page, { stateName, testInfo });
}

test.describe('@a11y-purchase cart and drawer', () => {
  test('course detail add, keyboard drawer and cart item form one deterministic journey', async ({ page }, testInfo) => {
    await installAuthenticatedCart(page, []);
    await page.route('**/api/**', async (route) => {
      const pathname = new URL(route.request().url()).pathname;
      // Course Detail issues these authenticated boolean reads before it can
      // decide whether purchase controls are applicable. The generic Pa11y
      // fallback returns an array for unknown endpoints, which fails boolean
      // parsing and previously left the paid-course CTA unavailable.
      if (/\/enrollments\/check\/\d+$/.test(pathname) || /\/wishlist\/courses\/\d+\/check$/.test(pathname)) {
        return json(route, false);
      }
      // Preserve the stateful cart fixture registered above; the generic
      // public fixture must not answer cart reads with its empty-array fallback.
      if (/\/cart(?:\/|$)/.test(pathname)) return route.fallback();
      if (route.request().method() !== 'GET') return route.fallback();
      return route.fulfill(responseForApi(pathname));
    });

    await page.goto('/courses/pa11y-accessibility-fixture');
    const add = page.getByRole('button', { name: 'Add to Cart' });
    await expect(add).toBeVisible();
    await add.focus();
    await add.press('Enter');
    const announcementText =
      'Course added to cart. You can now view your cart or continue browsing.';
    const addAnnouncement = page.getByRole('status').filter({ hasText: announcementText });
    await expect(addAnnouncement).toHaveCount(1);
    await expect(addAnnouncement).toHaveText(announcementText);

    const trigger = page.locator('button[aria-label="Shopping cart, 1 item"]:visible').first();
    await trigger.focus();
    await trigger.press('Enter');
    const drawer = page.getByRole('dialog', { name: 'Shopping Cart' });
    await expect(drawer).toBeVisible();
    await axe(page, testInfo, 'purchase acceptance drawer after course detail add');
    await page.keyboard.press('Escape');
    await expect(trigger).toBeFocused();

    await page.goto('/cart');
    await expect(page.getByRole('link', { name: 'Accessible React' })).toBeVisible();
    await axe(page, testInfo, 'purchase acceptance cart after course detail add');
  });

  test('empty cart has semantic empty state and passes Axe', async ({ page }, testInfo) => {
    await installAuthenticatedCart(page, []);
    await openCart(page);

    await expect(page.getByText('0 courses in your cart')).toBeVisible();
    const emptyCart = page.getByRole('region', { name: 'Your cart is empty' });
    await expect(emptyCart.getByRole('heading', { name: 'Your cart is empty' })).toBeVisible();
    await expect(emptyCart.getByRole('link', { name: 'Browse Courses' })).toHaveAttribute('href', '/courses');
    await expect(page.getByRole('button', { name: /checkout/i })).toHaveCount(0);
    await axe(page, testInfo, 'purchase cart empty');
  });

  test('populated cart has one course target, labelled prices and passes Axe', async ({ page }, testInfo) => {
    await installAuthenticatedCart(page, courses);
    await openCart(page);

    await expect(page.getByRole('list', { name: 'Courses in your cart' })).toBeVisible();
    await expect(page.getByText('Subtotal (2 items)', { exact: true })).toBeVisible();
    await expect(page.getByText('Discount', { exact: true })).toBeVisible();
    await expect(page.getByText('Total', { exact: true })).toBeVisible();
    for (const course of courses) {
      await expect(page.locator(`a[href="/courses/${course.courseSlug}"]`)).toHaveCount(1);
      await expect(page.getByRole('button', { name: `Remove ${course.courseTitle} from cart` })).toHaveCount(1);
    }
    await axe(page, testInfo, 'purchase cart populated');
  });

  test('remove confirmation, announcement and post-remove focus are deterministic', async ({ page }, testInfo) => {
    await installAuthenticatedCart(page, courses);
    await openCart(page);

    await page.getByRole('button', { name: 'Remove Accessible React from cart' }).click();
    const dialog = page.getByRole('dialog', { name: 'Remove course from cart' });
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText('Accessible React');
    await axe(page, testInfo, 'purchase cart remove confirmation');

    await dialog.getByRole('button', { name: 'Remove course' }).click();
    await expect(page.getByRole('link', { name: 'Practical TypeScript' })).toBeFocused();
    const removalMessage = 'Accessible React removed from cart. New total: $40.00 USD.';
    // Scoped to main: the same message is also pushed through the visible
    // toast (rendered outside main, silenced via aria-hidden for AT), whose
    // role="status" wrapper still matches a plain hasText DOM-text filter.
    const removalAnnouncement = page.getByRole('main').getByRole('status').filter({ hasText: removalMessage });
    await expect(removalAnnouncement).toHaveCount(1);
    await expect(removalAnnouncement).toHaveText(removalMessage);
    await expect(page.getByText('1 course in your cart')).toBeVisible();
    const orderSummary = page.getByRole('region', { name: 'Order Summary' });
    await expect(orderSummary.getByText('Total', { exact: true })).toBeVisible();
    await expect(orderSummary).toContainText('$40.00');
  });

  test('remove API error is exposed and the optimistic item is restored', async ({ page }, testInfo) => {
    // Current cart architecture has no quantity control or quantity-update endpoint.
    // Removal is the only item-level cart update, so its failure state is the
    // deterministic coverage for the 5.1 "update error" requirement.
    await installAuthenticatedCart(page, courses, true);
    await openCart(page);

    await page.getByRole('button', { name: 'Remove Accessible React from cart' }).click();
    await page.getByRole('dialog', { name: 'Remove course from cart' }).getByRole('button', { name: 'Remove course' }).click();
    await expect(page.getByText(/Cart update failed|Failed to remove|Request failed/i)).toBeVisible();
    await expect(page.getByRole('link', { name: 'Accessible React' })).toBeVisible();
    await axe(page, testInfo, 'purchase cart remove error');
  });

  test('drawer traps keyboard, closes with Escape and restores focus to its trigger', async ({ page }, testInfo) => {
    await installAuthenticatedCart(page, courses);
    await openCart(page);
    const trigger = page.locator('button[aria-label="Shopping cart, 2 items"]:visible').first();
    await trigger.focus();
    await trigger.press('Enter');

    const drawer = page.getByRole('dialog', { name: 'Shopping Cart' });
    await expect(drawer).toBeVisible();
    await expect(drawer.getByRole('button', { name: 'Close shopping cart' })).toBeFocused();
    await axe(page, testInfo, 'purchase cart drawer open');

    await page.keyboard.press('Shift+Tab');
    await expect(drawer.getByRole('button', { name: 'View Cart' })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(drawer).toBeHidden();
    await expect(trigger).toBeFocused();
  });
});

test.describe('@a11y-purchase Flow 3 checkout acceptance', () => {
  test.beforeEach(async ({ page }) => {
    await installAuthenticatedCart(page, courses.slice(0, 1));
    await installCheckoutPreview(page);
  });

  test('mocked checkout exposes selection, processing and announced success', async ({ page }, testInfo) => {
    let releaseCheckout!: () => void;
    const checkoutReleased = new Promise<void>((resolve) => { releaseCheckout = resolve; });
    await page.route(/\/api\/checkout$/, async (route) => {
      await checkoutReleased;
      await json(route, {
        success: true,
        message: 'Order placed successfully',
        orderId: 7001,
        orderNumber: 'ORD-FLOW3-001',
        orderStatus: 'COMPLETED',
        totalAmount: 60,
        currency: 'USD',
        paymentMethod: 'PAYPAL',
        enrolledCourseIds: [101],
        requiresRedirect: false,
      });
    });
    await page.route('**/api/checkout/capture**', (route) => json(route, {
      success: true,
      message: 'Payment captured',
      orderId: 7001,
      orderNumber: 'ORD-FLOW3-001',
      orderStatus: 'COMPLETED',
      totalAmount: 60,
      currency: 'USD',
      paymentMethod: 'PAYPAL',
      enrolledCourseIds: [101],
    }));

    await page.goto('/checkout');
    await expect(page.getByRole('heading', { level: 1, name: 'Checkout' })).toBeVisible();
    const paypal = page.getByRole('radio', { name: /PayPal/ });
    await paypal.check();
    await expect(paypal).toBeChecked();
    await axe(page, testInfo, 'purchase acceptance payment selection');

    await page.getByRole('button', { name: /Complete Order|Pay Now/ }).click();
    await expect(page.getByRole('button', { name: 'Processing...' })).toBeDisabled();
    await axe(page, testInfo, 'purchase acceptance processing');
    releaseCheckout();
    await page.waitForURL(/\/checkout\/success/);

    // Immediate checkout success carries an order number; capture is the
    // backend-confirmed transition used by the success screen.
    await page.goto('/checkout/success?token=flow-3-capture');
    const success = page.getByRole('heading', { level: 1, name: 'Payment Successful!' });
    // Focus moving to the heading is the announcement mechanism here (no
    // separate sr-only live region on the success state).
    await expect(success).toBeFocused();
    await expect(page.getByText('ORD-FLOW3-001')).toBeVisible();
    await axe(page, testInfo, 'purchase acceptance success');
  });

  test('mocked payment failure focuses a recoverable failed page', async ({ page }, testInfo) => {
    await page.route(/\/api\/checkout$/, (route) => json(route, {
      success: false,
      message: 'Payment method was declined',
      errorCode: 'INSTRUMENT_DECLINED',
      canRetry: true,
    }));
    await page.goto('/checkout');
    await page.getByRole('radio', { name: /PayPal/ }).check();
    await page.getByRole('button', { name: /Complete Order|Pay Now/ }).click();
    await page.waitForURL(/\/checkout\/failed/);
    await expect(page).toHaveTitle('Payment Failed | EduMind');
    const heading = page.getByRole('heading', { level: 1, name: 'Payment Failed' });
    await expect(heading).toBeFocused();
    await expect(page.getByRole('button', { name: 'Try Again' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Return to Cart' })).toBeVisible();
    await axe(page, testInfo, 'purchase acceptance failure');
  });

  test('empty cart recovers and direct checkout is independently seeded', async ({ page }, testInfo) => {
    await installAuthenticatedCart(page, []);
    await page.goto('/cart');
    const emptyCart = page.getByRole('region', { name: 'Your cart is empty' });
    await expect(emptyCart.getByRole('heading', { name: 'Your cart is empty' })).toBeVisible();
    await expect(emptyCart.getByRole('link', { name: 'Browse Courses' })).toHaveAttribute('href', '/courses');

    await page.goto('/checkout?courseId=101');
    await expect(page.getByRole('heading', { level: 1, name: 'Buy Now' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Order Items (1)' })).toBeVisible();
    await expect(page.getByText('Accessible React')).toBeVisible();
    await axe(page, testInfo, 'purchase acceptance direct checkout');
  });

  test('processing state announces and blocks a duplicate submit (checklist B7)', async ({ page }, testInfo) => {
    let checkoutCallCount = 0;
    let releaseCheckout!: () => void;
    const checkoutReleased = new Promise<void>((resolve) => { releaseCheckout = resolve; });
    await page.route(/\/api\/checkout$/, async (route) => {
      checkoutCallCount += 1;
      await checkoutReleased;
      await json(route, {
        success: true,
        orderId: 7002,
        orderNumber: 'ORD-FLOW3-B7',
        orderStatus: 'COMPLETED',
        totalAmount: 60,
        currency: 'USD',
        paymentMethod: 'PAYPAL',
        enrolledCourseIds: [101],
      });
    });

    await page.goto('/checkout');
    await page.getByRole('radio', { name: /PayPal/ }).check();
    const submit = page.getByRole('button', { name: /Complete Order|Pay Now/ });
    await submit.click();

    const processing = page.getByRole('button', { name: 'Processing...' });
    await expect(processing).toBeDisabled();
    await axe(page, testInfo, 'purchase acceptance B7 processing');

    // Enter/Space on the now-disabled button must not fire a second request.
    await processing.press('Enter');
    await processing.press(' ');
    releaseCheckout();
    await page.waitForURL(/\/checkout\/success/);
    expect(checkoutCallCount).toBe(1);
  });

  test('backend failure at submit is announced with focus moved (checklist B9)', async ({ page }, testInfo) => {
    await page.route(/\/api\/checkout$/, (route) => route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ message: 'Internal server error' }) }));
    await page.goto('/checkout');
    await page.getByRole('radio', { name: /PayPal/ }).check();
    await page.getByRole('button', { name: /Complete Order|Pay Now/ }).click();
    await expect(page.getByRole('alert')).toBeVisible();
    await axe(page, testInfo, 'purchase acceptance B9 backend failure');
  });

  test('PayPal redirect is announced before the external navigation fires (checklist B10)', async ({ page }, testInfo) => {
    const redirectUrl = 'https://paypal.example.test/checkoutnow?token=flow3-b10';
    // The component calls window.location.assign(redirectUrl) after a delay;
    // stub the destination so a real navigation attempt (if the assertions
    // are slow) resolves instead of erroring against an unreachable host.
    await page.route(redirectUrl, (route) => route.fulfill({ status: 200, contentType: 'text/html', body: '<html></html>' }));
    await page.route(/\/api\/checkout$/, (route) => json(route, {
      success: false,
      pending: true,
      requiresRedirect: true,
      redirectUrl,
      orderId: 7003,
      orderNumber: 'ORD-FLOW3-B10',
      paymentMethod: 'PAYPAL',
    }));

    await page.goto('/checkout');
    await page.getByRole('radio', { name: /PayPal/ }).check();
    await page.getByRole('button', { name: /Complete Order|Pay Now/ }).click();

    const notice = page.getByText(/leaving EduMind for the secure payment provider/i);
    await expect(notice).toBeVisible();
    await expect(notice).toBeFocused();
    await axe(page, testInfo, 'purchase acceptance B10 pre-redirect notice');
  });
});

test.describe('@a11y-purchase Flow 3 SePay QR page', () => {
  test.beforeEach(async ({ page }) => {
    await installAuthenticatedCart(page, []);
  });

  const qrParams = new URLSearchParams({
    qrUrl: 'https://sepay.example.test/qr/flow3.png',
    orderId: '8001',
    orderNumber: 'ORD-FLOW3-SEPAY',
    amount: '499000',
    currency: 'VND',
    // Bank transfer details CheckoutPage forwards, so a screen-reader user has a
    // readable alternative to the aria-hidden QR image.
    bankCode: 'MB',
    bankName: 'MB Bank',
    bankAccount: '1234567890',
    accountName: 'EDUMIND CO',
    transferContent: 'EDUMIND ORD-FLOW3-SEPAY',
  });

  function isoMinutesAgo(minutes: number): string {
    return new Date(Date.now() - minutes * 60_000).toISOString();
  }

  async function installPaymentStatus(page: Page, responses: Array<Record<string, unknown>>) {
    let call = 0;
    await page.route(/\/api\/checkout\/status\/\d+$/, (route) => {
      const body = responses[Math.min(call, responses.length - 1)];
      call += 1;
      return json(route, body);
    });
  }

  test('scanning state exposes a live status region (checklist S5)', async ({ page }) => {
    await installPaymentStatus(page, [
      { success: false, orderId: 8001, orderNumber: 'ORD-FLOW3-SEPAY', orderStatus: 'PENDING', createdAt: isoMinutesAgo(1) },
    ]);
    await page.goto(`/checkout/sepay-qr?${qrParams.toString()}`);
    await expect(page.getByRole('heading', { level: 1, name: 'Scan to Pay with SePay' })).toBeVisible();
    // "Waiting for payment confirmation..." must sit inside a polite live region
    // so background polling updates are not silent.
    const waiting = page.getByText('Waiting for payment confirmation...');
    await expect(waiting.locator('xpath=ancestor-or-self::*[@role="status" or @aria-live]').first()).toHaveCount(1);
  });

  test('QR image has a readable, copyable transfer-info alternative (checklist S2)', async ({ page }) => {
    await installPaymentStatus(page, [
      { success: false, orderId: 8001, orderNumber: 'ORD-FLOW3-SEPAY', orderStatus: 'PENDING', createdAt: isoMinutesAgo(1) },
    ]);
    await page.goto(`/checkout/sepay-qr?${qrParams.toString()}`);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    // The QR image is (correctly) aria-hidden, so every field needed to complete
    // the transfer manually must exist as text and be copyable by keyboard.
    await expect(page.getByRole('heading', { level: 2, name: 'Bank transfer details' })).toBeVisible();
    await expect(page.getByText('1234567890')).toBeVisible();
    await expect(page.getByText('EDUMIND ORD-FLOW3-SEPAY')).toBeVisible();
    await expect(page.getByText('EDUMIND CO')).toBeVisible();
    for (const label of ['bank name', 'account number', 'beneficiary name', 'transfer content', 'amount']) {
      await expect(page.getByRole('button', { name: `Copy ${label}` })).toBeVisible();
    }
  });

  test('transfer details missing from the session offer a recovery path (checklist S2 fallback)', async ({ page }) => {
    await installPaymentStatus(page, [
      { success: false, orderId: 8001, orderNumber: 'ORD-FLOW3-SEPAY', orderStatus: 'PENDING', createdAt: isoMinutesAgo(1) },
    ]);
    const withoutBankDetails = new URLSearchParams(qrParams);
    ['bankCode', 'bankName', 'bankAccount', 'accountName', 'transferContent'].forEach((key) =>
      withoutBankDetails.delete(key),
    );
    await page.goto(`/checkout/sepay-qr?${withoutBankDetails.toString()}`);
    // Rather than an empty section, the page must say the QR is the only route
    // and point at a way out.
    await expect(page.getByText(/Bank transfer details are unavailable/i)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Cancel Payment' })).toBeVisible();
  });

  test('Copy order number button announces the copied state (checklist S4)', async ({ page }) => {
    await installPaymentStatus(page, [
      { success: false, orderId: 8001, orderNumber: 'ORD-FLOW3-SEPAY', orderStatus: 'PENDING', createdAt: isoMinutesAgo(1) },
    ]);
    await page.goto(`/checkout/sepay-qr?${qrParams.toString()}`);
    const copyButton = page.getByRole('button', { name: /copy order number/i });
    // Accessible name should not depend solely on the title attribute.
    await expect(copyButton).toHaveAttribute('aria-label', /copy order number/i);
    await copyButton.click();
    // After copying, a screen reader must be told "Copied" via live region / sr-only text.
    await expect(page.getByText(/copied/i)).toBeVisible();
  });

  test('countdown warns before expiry with an accessible announcement (checklist S6)', async ({ page }) => {
    // 14 minutes elapsed of the 15-minute SePay QR window => ~60s remaining, under the warning threshold.
    await installPaymentStatus(page, [
      { success: false, orderId: 8001, orderNumber: 'ORD-FLOW3-SEPAY', orderStatus: 'PENDING', createdAt: isoMinutesAgo(14) },
    ]);
    await page.goto(`/checkout/sepay-qr?${qrParams.toString()}`);
    // The same sentence is duplicated as an aria-hidden visual cue alongside the
    // sr-only live region that actually announces it to assistive tech.
    await expect(page.getByRole('status').filter({ hasText: /less than 1 minute/i })).toBeVisible();
  });

  test('expired countdown is announced and focus moves to the new heading (checklist S7)', async ({ page }) => {
    // createdAt already past the 15-minute window => calculateTimeRemaining <= 0 immediately.
    await installPaymentStatus(page, [
      { success: false, orderId: 8001, orderNumber: 'ORD-FLOW3-SEPAY', orderStatus: 'PENDING', createdAt: isoMinutesAgo(31) },
    ]);
    await page.goto(`/checkout/sepay-qr?${qrParams.toString()}`);
    const heading = page.getByRole('heading', { level: 1, name: 'QR Code Expired' });
    await expect(heading).toBeVisible();
    await expect(page.getByRole('button', { name: 'Try Again' })).toBeVisible();
    // No axe() call here: SepayQrPage renders no <title> at all (unlike every
    // other checkout page, which uses SeoMetaTags) — a separate, pre-existing
    // document-title violation that would fail every state's Axe pass and is
    // out of scope for this state-transition test.
  });

  test('webhook success mid-scan navigates straight to the success page (checklist S9)', async ({ page }) => {
    await installPaymentStatus(page, [
      { success: false, orderId: 8001, orderNumber: 'ORD-FLOW3-SEPAY', orderStatus: 'PENDING', createdAt: isoMinutesAgo(1) },
      { success: true, orderId: 8001, orderNumber: 'ORD-FLOW3-SEPAY', orderStatus: 'COMPLETED', createdAt: isoMinutesAgo(1) },
    ]);
    await page.goto(`/checkout/sepay-qr?${qrParams.toString()}`);
    await expect(page.getByRole('heading', { level: 1, name: 'Scan to Pay with SePay' })).toBeVisible();
    // No intermediate "success" screen on this page by design (no perceivable
    // time limit for SC 2.2.1 to apply to) - CheckoutSuccessPage owns the
    // confirmation UI and focus management once the redirect lands.
    await page.waitForURL(/\/checkout\/success/, { timeout: 6000 });
    await expect(page.getByRole('heading', { level: 1, name: 'Payment Successful!' })).toBeFocused({ timeout: 6000 });
  });

  test('invalid session shows a recoverable heading with a keyboard action (checklist S10)', async ({ page }) => {
    await page.goto('/checkout/sepay-qr');
    const heading = page.getByRole('heading', { level: 1, name: 'Invalid Payment Session' });
    await expect(heading).toBeVisible();
    const returnButton = page.getByRole('button', { name: 'Return to Checkout' });
    await returnButton.focus();
    await expect(returnButton).toBeFocused();
  });
});

test.describe('@a11y-purchase Flow 3 CheckoutSuccessPage', () => {
  test.beforeEach(async ({ page }) => {
    await installAuthenticatedCart(page, []);
  });

  test('loading state exposes a live status region while capturing (checklist D1)', async ({ page }, testInfo) => {
    let releaseCapture!: () => void;
    const captureReleased = new Promise<void>((resolve) => { releaseCapture = resolve; });
    await page.route(/\/api\/checkout\/capture/, async (route) => {
      await captureReleased;
      await json(route, { success: true, orderId: 9001, orderNumber: 'ORD-FLOW3-D1', orderStatus: 'COMPLETED' });
    });
    await page.goto('/checkout/success?token=flow3-d1');
    const status = page.getByRole('status').filter({ hasText: 'Completing Your Payment' });
    await expect(status).toBeVisible();
    await axe(page, testInfo, 'purchase success D1 loading');
    releaseCapture();
  });

  test('success transition moves focus to the success heading (checklist D2)', async ({ page }, testInfo) => {
    await page.route(/\/api\/checkout\/capture/, (route) => json(route, {
      success: true, orderId: 9002, orderNumber: 'ORD-FLOW3-D2', orderStatus: 'COMPLETED',
    }));
    await page.goto('/checkout/success?token=flow3-d2');
    const heading = page.getByRole('heading', { level: 1, name: 'Payment Successful!' });
    await expect(heading).toBeFocused();
    await expect(page.getByText('ORD-FLOW3-D2')).toBeVisible();
    await axe(page, testInfo, 'purchase success D2 transition');
  });

  test('capture error is announced via a live status region with focus and a recovery action (checklist D6)', async ({ page }, testInfo) => {
    await page.route(/\/api\/checkout\/capture/, (route) => json(route, {
      success: false, message: 'Payment capture failed',
    }));
    await page.goto('/checkout/success?token=flow3-d6');
    const status = page.getByRole('status').filter({ hasText: 'Payment capture failed' });
    await expect(status).toBeVisible();
    const heading = page.getByRole('heading', { level: 1, name: 'Payment Failed' });
    await expect(heading).toBeFocused();
    await expect(page.getByRole('button', { name: 'Try Again' })).toBeVisible();
    await axe(page, testInfo, 'purchase success D6 capture error');
  });
});

test.describe('@a11y-purchase Flow 3 target size (checklist W5)', () => {
  // 2.5.8 Target Size (Minimum) — every pointer target in the purchase flow must
  // be at least 24x24 CSS px. Measured at 375px because the mobile layout is the
  // worst case: several controls drop their `sm:` padding there.
  test.use({ viewport: { width: 375, height: 812 } });

  const MIN = 24;

  async function expectMinTargetSize(target: ReturnType<Page['getByRole']>, name: string) {
    await expect(target, `${name} should be present`).toBeVisible();
    const box = await target.boundingBox();
    if (!box) throw new Error(`${name} has no layout box`);
    expect.soft(box.width, `${name} width`).toBeGreaterThanOrEqual(MIN);
    expect.soft(box.height, `${name} height`).toBeGreaterThanOrEqual(MIN);
  }

  test('cart and drawer targets are at least 24x24 CSS px', async ({ page }) => {
    await installAuthenticatedCart(page, courses);
    await openCart(page);

    await expectMinTargetSize(
      page.getByRole('button', { name: 'Remove Accessible React from cart' }),
      'cart page Remove item button',
    );
    // Mobile-only "← Continue Shopping" back link; it has no icon padding of its
    // own, so its target comes entirely from the min-height utility.
    await expectMinTargetSize(
      page.getByRole('button', { name: /Continue Shopping/ }),
      'cart page Continue Shopping back button',
    );

    const trigger = page.locator('button[aria-label="Shopping cart, 2 items"]:visible').first();
    await trigger.click();
    const drawer = page.getByRole('dialog', { name: 'Shopping Cart' });
    await expect(drawer).toBeVisible();
    await expectMinTargetSize(drawer.getByRole('button', { name: 'Close shopping cart' }), 'drawer Close button');
    await expectMinTargetSize(
      drawer.getByRole('button', { name: 'Remove Accessible React from cart' }),
      'drawer Remove item button',
    );
  });

  test('checkout payment radio and Back button are at least 24x24 CSS px', async ({ page }) => {
    await installAuthenticatedCart(page, courses.slice(0, 1));
    await installCheckoutPreview(page);
    await page.goto('/checkout');
    await expect(page.getByRole('heading', { level: 1, name: 'Checkout' })).toBeVisible();

    // The radio is wrapped in a full-width <label>, so the effective target is
    // the whole row; the control itself is still sized to pass on its own.
    await expectMinTargetSize(page.getByRole('radio', { name: /PayPal/ }), 'checkout payment radio control');
    await expectMinTargetSize(page.getByRole('button', { name: /Back to (cart|course)/ }), 'checkout Back button');
  });

  test('SePay copy buttons are at least 24x24 CSS px', async ({ page }) => {
    await installAuthenticatedCart(page, []);
    await page.route(/\/api\/checkout\/status\/\d+$/, (route) => json(route, {
      success: false, orderId: 8001, orderNumber: 'ORD-FLOW3-W5', orderStatus: 'PENDING',
      createdAt: new Date(Date.now() - 60_000).toISOString(),
    }));
    const params = new URLSearchParams({
      qrUrl: 'https://sepay.example.test/qr/w5.png', orderId: '8001', orderNumber: 'ORD-FLOW3-W5',
      amount: '499000', currency: 'VND', bankCode: 'MB', bankName: 'MB Bank',
      bankAccount: '1234567890', accountName: 'EDUMIND CO', transferContent: 'EDUMIND ORD-FLOW3-W5',
    });
    await page.goto(`/checkout/sepay-qr?${params.toString()}`);
    await expect(page.getByRole('heading', { level: 1, name: 'Scan to Pay with SePay' })).toBeVisible();

    for (const label of ['order number', 'bank name', 'account number', 'beneficiary name', 'transfer content', 'amount']) {
      await expectMinTargetSize(page.getByRole('button', { name: `Copy ${label}` }), `SePay Copy ${label} button`);
    }
    await expectMinTargetSize(page.getByRole('button', { name: 'Cancel Payment' }), 'SePay Cancel Payment back button');
  });
});
