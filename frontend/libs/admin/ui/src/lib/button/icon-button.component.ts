import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonSize, ButtonVariant } from './button.component';

@Component({
  selector: 'app-icon-button',
  standalone: true,
  imports: [CommonModule],
  template: `
    <button
      [type]="type"
      [disabled]="disabled"
      [attr.aria-label]="ariaLabel"
      [class]="getButtonClasses()"
    >
      <ng-content />
    </button>
  `,
})
export class IconButtonComponent {
  @Input() variant: ButtonVariant = 'primary';
  @Input() size: ButtonSize = 'md';
  @Input() type: 'button' | 'submit' | 'reset' = 'button';
  @Input() disabled = false;
  @Input() ariaLabel!: string;

  private variantClasses: Record<ButtonVariant, string> = {
    primary: 'bg-purple-600 hover:bg-purple-700 text-white',
    secondary: 'bg-gray-600 hover:bg-gray-700 text-white',
    outline: 'border-2 border-purple-600 text-purple-600 hover:bg-purple-50',
    ghost: 'text-purple-600 hover:bg-purple-50',
    danger: 'bg-red-600 hover:bg-red-700 text-white',
  };

  private sizeClasses: Record<ButtonSize, string> = {
    sm: 'p-1.5',
    md: 'p-2',
    lg: 'p-3',
  };

  getButtonClasses(): string {
    return [
      'inline-flex items-center justify-center rounded-lg transition-all duration-200',
      'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500',
      this.variantClasses[this.variant],
      this.sizeClasses[this.size],
      this.disabled ? 'opacity-50 cursor-not-allowed' : '',
    ]
      .filter(Boolean)
      .join(' ');
  }
}