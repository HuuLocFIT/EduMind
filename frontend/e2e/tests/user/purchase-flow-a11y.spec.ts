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
    await expect(page.getByText('Subtotal (2 items):')).toBeVisible();
    await expect(page.getByText('Discount:')).toBeVisible();
    await expect(page.getByText('Total:')).toBeVisible();
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
    const removalAnnouncement = page.getByRole('status').filter({ hasText: removalMessage });
    await expect(removalAnnouncement).toHaveCount(1);
    await expect(removalAnnouncement).toHaveText(removalMessage);
    await expect(page.getByText('1 course in your cart')).toBeVisible();
    const orderSummary = page.getByRole('region', { name: 'Order Summary' });
    await expect(orderSummary.getByText('Total:', { exact: true })).toBeVisible();
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
    await expect(success).toBeFocused();
    const paymentStatus = page.getByRole('status').filter({
      hasText: 'Payment completed successfully.',
    });
    await expect(paymentStatus).toHaveText('Payment completed successfully.');
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
});
