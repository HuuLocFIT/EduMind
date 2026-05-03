import type { Page, Locator } from '@playwright/test';

export class CartPage {
  readonly page: Page;
  readonly cartItems: Locator;
  readonly checkoutButton: Locator;
  readonly emptyState: Locator;

  constructor(page: Page) {
    this.page = page;
    this.cartItems = page.locator('[data-testid="cart-item"]').or(
      page.locator('li').filter({ has: page.getByRole('button', { name: /remove/i }) })
    );
    this.checkoutButton = page.getByRole('button', { name: /checkout|proceed/i });
    this.emptyState = page.getByText(/your cart is empty|no items/i);
  }

  async goto() {
    await this.page.goto('/cart');
  }

  async getItemCount(): Promise<number> {
    return this.cartItems.count();
  }

  async proceedToCheckout() {
    await this.checkoutButton.click();
    await this.page.waitForURL(/\/checkout/);
  }
}
