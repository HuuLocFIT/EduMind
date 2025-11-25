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

  private variantClasses: Record<CardVariant, string> = {
    default: 'bg-slate-800',
    bordered: 'bg-slate-800 border border-slate-700',
    elevated: 'bg-slate-800 shadow-lg hover:shadow-xl transition-shadow duration-200',
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
    ].join(' ');
  }
}