import { expect, test, type Page, type Route, type TestInfo } from '@playwright/test';
import { checkA11y } from '../../utils/accessibility.js';

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

async function openCart(page: Page) {
  await page.goto('/cart');
  await expect(page.getByRole('heading', { level: 1, name: 'Shopping Cart' })).toBeVisible();
}

async function axe(page: Page, testInfo: TestInfo, stateName: string) {
  await checkA11y(page, { stateName, testInfo });
}

test.describe('@a11y-purchase cart and drawer', () => {
  test('empty cart has semantic empty state and passes Axe', async ({ page }, testInfo) => {
    await installAuthenticatedCart(page, []);
    await openCart(page);

    await expect(page.getByText('0 courses in your cart')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Your cart is empty' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Browse Courses' })).toHaveAttribute('href', '/courses');
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
    await expect(page.getByRole('status')).toContainText('Accessible React removed from cart. New total: $40.00 USD.');
    await expect(page.getByText('1 course in your cart')).toBeVisible();
    await expect(page.getByText('Total:').locator('..')).toContainText('$40.00');
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
