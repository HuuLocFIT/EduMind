import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (isOpen) {
      <div
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
        role="dialog"
        [attr.aria-modal]="true"
        [attr.aria-labelledby]="title ? 'modal-title' : null"
      >
        <!-- Backdrop -->
        <div
          class="absolute inset-0 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
          (click)="handleBackdropClick()"
          aria-hidden="true"
        ></div>

        <!-- Modal -->
        <div
          [class]="getModalClasses()"
        >
          <!-- Header -->
          @if (title || showCloseButton) {
            <div class="flex items-center justify-between p-6 border-b border-slate-700">
              @if (title) {
                <h2 id="modal-title" class="text-xl font-semibold text-white">
                  {{ title }}
                </h2>
              }
              @if (showCloseButton) {
                <button
                  (click)="close.emit()"
                  class="p-1 rounded-lg hover:bg-slate-700 transition-colors text-gray-400 hover:text-white"
                  aria-label="Close modal"
                >
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              }
            </div>
          }

          <!-- Content -->
          <div class="p-6">
            <ng-content />
          </div>
        </div>
      </div>
    }
  `,
})
export class ModalComponent implements OnInit, OnDestroy {
  @Input() isOpen = false;
  @Input() title = '';
  @Input() size: ModalSize = 'md';
  @Input() showCloseButton = true;
  @Input() closeOnOverlayClick = true;
  @Input() closeOnEscape = true;
  @Output() close = new EventEmitter<void>();

  private sizeClasses: Record<ModalSize, string> = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    full: 'max-w-full mx-4',
  };

  ngOnInit(): void {
    if (this.closeOnEscape) {
      document.addEventListener('keydown', this.handleEscape);
    }
  }

  ngOnDestroy(): void {
    document.removeEventListener('keydown', this.handleEscape);
    document.body.style.overflow = 'unset';
  }

  private handleEscape = (e: KeyboardEvent): void => {
    if (e.key === 'Escape' && this.isOpen) {
      this.close.emit();
    }
  };

  handleBackdropClick(): void {
    if (this.closeOnOverlayClick) {
      this.close.emit();
    }
  }

  getModalClasses(): string {
    return [
      'relative bg-slate-800 rounded-lg shadow-xl w-full',
      'animate-in zoom-in-95 duration-200',
      this.sizeClasses[this.size],
    ].join(' ');
  }
}