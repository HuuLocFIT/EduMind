import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

export type AlertVariant = 'info' | 'success' | 'warning' | 'error';

@Component({
  selector: 'app-alert',
  standalone: true,
  imports: [CommonModule],
  host: { class: 'block' },
  template: `
    <div [class]="getAlertClasses()" role="alert">
      <div [class]="getIconClasses()">
        <ng-container [ngSwitch]="variant">
          <svg *ngSwitchCase="'info'" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <svg *ngSwitchCase="'success'" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <svg *ngSwitchCase="'warning'" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <svg *ngSwitchCase="'error'" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </ng-container>
      </div>

      <div class="flex-1 min-w-0">
        @if (title) {
          <h4 [class]="getTitleClasses()">{{ title }}</h4>
        }
        <p [class]="getMessageClasses()">{{ message }}</p>
      </div>

      @if (dismissible) {
        <button
          type="button"
          (click)="onClose.emit()"
          [class]="getCloseButtonClasses()"
          aria-label="Close alert"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      }
    </div>
  `,
})
export class AlertComponent {
  @Input() variant: AlertVariant = 'info';
  @Input() title = '';
  @Input() message!: string;
  @Input() dismissible = false;
  // eslint-disable-next-line @angular-eslint/no-output-on-prefix
  @Output() onClose = new EventEmitter<void>();

  private variantConfig: Record<AlertVariant, { container: string; icon: string; title: string; message: string }> = {
    info: {
      container: 'bg-info-50 border-info-200',
      icon: 'text-info-600',
      title: 'text-info-800',
      message: 'text-info-700',
    },
    success: {
      container: 'bg-success-50 border-success-200',
      icon: 'text-success-600',
      title: 'text-success-800',
      message: 'text-success-700',
    },
    warning: {
      container: 'bg-warning-50 border-warning-200',
      icon: 'text-warning-600',
      title: 'text-warning-800',
      message: 'text-warning-700',
    },
    error: {
      container: 'bg-danger-50 border-danger-200',
      icon: 'text-danger-600',
      title: 'text-danger-800',
      message: 'text-danger-700',
    },
  };

  getAlertClasses(): string {
    return [
      'p-4 border rounded-xl flex items-center gap-3 shadow-sm',
      this.variantConfig[this.variant].container,
    ].join(' ');
  }

  getIconClasses(): string {
    return [
      'flex-shrink-0 mt-0.5',
      this.variantConfig[this.variant].icon,
    ].join(' ');
  }

  getTitleClasses(): string {
    return [
      'text-sm font-semibold mb-1',
      this.variantConfig[this.variant].title,
    ].join(' ');
  }

  getMessageClasses(): string {
    return [
      'text-sm',
      this.variantConfig[this.variant].message,
    ].join(' ');
  }

  getCloseButtonClasses(): string {
    return [
      'flex-shrink-0 p-0.5 rounded hover:bg-white/10 transition-colors',
      this.variantConfig[this.variant].icon,
    ].join(' ');
  }
}