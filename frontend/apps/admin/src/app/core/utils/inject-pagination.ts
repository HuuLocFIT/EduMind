import { Signal, computed, signal } from '@angular/core';

export interface PagedApiResponse<T> {
  data?: T[] | null;
  pagination?: { totalElements?: number; page?: number } | null;
}

export function injectPagination<T>(pageSize = 10) {
  const currentPage = signal(1);
  const totalItems = signal(0);
  const totalPages: Signal<number> = computed(() => Math.ceil(totalItems() / pageSize));

  function applyPagedResponse(response: PagedApiResponse<T>, setItems: (items: T[]) => void): void {
    const items = response.data ?? [];
    setItems(items);
    totalItems.set(response.pagination?.totalElements ?? items.length);
    currentPage.set((response.pagination?.page ?? 0) + 1);
  }

  function goToPage(page: number): void {
    currentPage.set(page);
  }

  function resetPage(): void {
    currentPage.set(1);
  }

  function getStartIndex(): number {
    return totalItems() > 0 ? (currentPage() - 1) * pageSize + 1 : 0;
  }

  function getEndIndex(): number {
    return Math.min(currentPage() * pageSize, totalItems());
  }

  return { currentPage, totalItems, totalPages, pageSize, applyPagedResponse, goToPage, resetPage, getStartIndex, getEndIndex };
}
