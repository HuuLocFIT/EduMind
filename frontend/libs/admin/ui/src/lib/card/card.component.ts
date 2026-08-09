import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export type CardVariant = 'default' | 'bordered' | 'elevated';
export type CardPadding = 'none' | 'sm' | 'md' | 'lg';

@Component({
  selector: 'app-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div [class]="getCardClasses()">
      <ng-content />
    </div>
  `,
})
export class CardComponent {
  @Input() variant: CardVariant = 'default';
  @Input() padding: CardPadding = 'md';
  /** Optional extra utility classes for consumer overrides (e.g. light surfaces). */
  @Input() customClass = '';

  private variantClasses: Record<CardVariant, string> = {
    default: 'bg-white',
    bordered: 'bg-white border border-neutral-200',
    elevated: 'bg-white shadow-rest hover:shadow-hover transition-shadow duration-200',
  };

  private paddingClasses: Record<CardPadding, string> = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };

  getCardClasses(): string {
    return [
      'rounded-lg',
      this.variantClasses[this.variant],
      this.paddingClasses[this.padding],
      this.customClass,
    ].join(' ');
  }
}