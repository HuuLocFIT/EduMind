import { WritableSignal, signal } from '@angular/core';

export interface ModalState<T> {
  isOpen: WritableSignal<boolean>;
  data: WritableSignal<T | null>;
  open(item: T): void;
  close(): void;
}

/**
 * Factory for a simple open/data modal state pair.
 * Must be called in an injection context (field initializer or constructor).
 *
 * Usage:
 *   private deleteModal = injectModal<Course>();
 *   showDeleteModal = this.deleteModal.isOpen;  // expose as WritableSignal for template .set()
 *   selectedCourse  = this.deleteModal.data;
 */
export function injectModal<T = unknown>(): ModalState<T> {
  const isOpen = signal(false);
  const data = signal<T | null>(null);

  function open(item: T): void {
    data.set(item);
    isOpen.set(true);
  }

  function close(): void {
    isOpen.set(false);
  }

  return { isOpen, data, open, close };
}
