import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

@Component({
  selector: 'app-button',
  standalone: true,
  imports: [CommonModule],
  template: `
    <button
      [type]="type"
      [disabled]="disabled || isLoading"
      [class]="getButtonClasses()"
      (click)="handleClick($event)"
    >
      @if (isLoading) {
        <svg
          class="animate-spin h-5 w-5"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            class="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            stroke-width="4"
          />
          <path
            class="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
        <span>Loading...</span>
      } @else {
        @if (leftIcon) {
          <ng-content select="[leftIcon]" />
        }
        <ng-content />
        @if (rightIcon) {
          <ng-content select="[rightIcon]" />
        }
      }
    </button>
  `,
  styles: [],
})
export class ButtonComponent {
  @Input() variant: ButtonVariant = 'primary';
  @Input() size: ButtonSize = 'md';
  @Input() type: 'button' | 'submit' | 'reset' = 'button';
  @Input() isLoading = false;
  @Input() disabled = false;
  @Input() fullWidth = false;
  @Input() leftIcon = false;
  @Input() rightIcon = false;

  private variantClasses: Record<ButtonVariant, string> = {
    primary: 'bg-brand-600 hover:bg-brand-700 text-white shadow-rest hover:shadow-hover',
    secondary: 'bg-neutral-600 hover:bg-neutral-700 text-white shadow-rest hover:shadow-hover',
    outline:
      'bg-brand-50 text-brand-700 border border-brand-200 shadow-rest hover:bg-brand-100 hover:border-brand-300 hover:shadow-hover',
    ghost: 'text-brand-600 hover:bg-brand-50',
    danger: 'bg-danger-600 hover:bg-danger-700 text-white shadow-rest hover:shadow-hover',
  };

  private sizeClasses: Record<ButtonSize, string> = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };

  getButtonClasses(): string {
    return [
      'inline-flex items-center justify-center gap-2 font-semibold rounded-lg transition-all duration-200',
      'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500',
      this.variantClasses[this.variant],
      this.sizeClasses[this.size],
      this.disabled || this.isLoading ? 'opacity-50 cursor-not-allowed' : '',
      this.fullWidth ? 'w-full' : '',
    ]
      .filter(Boolean)
      .join(' ');
  }

  handleClick(event: Event): void {
    if (this.disabled || this.isLoading) {
      event.preventDefault();
      event.stopPropagation();
    }
  }
}