import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export type BadgeVariant = 
  | 'default' 
  | 'primary' 
  | 'secondary' 
  | 'success' 
  | 'warning' 
  | 'error' 
  | 'info';

export type BadgeSize = 'sm' | 'md' | 'lg';

@Component({
  selector: 'app-badge',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span [class]="getBadgeClasses()">
      <ng-content />
    </span>
  `,
})
export class BadgeComponent {
  @Input() variant: BadgeVariant = 'default';
  @Input() size: BadgeSize = 'md';
  @Input() rounded: 'sm' | 'md' | 'full' = 'full';
  @Input() dot = false;

  getBadgeClasses(): string {
    const base = 'inline-flex items-center font-medium';
    
    const sizes: Record<BadgeSize, string> = {
      sm: 'px-2 py-0.5 text-xs',
      md: 'px-2.5 py-1 text-xs',
      lg: 'px-3 py-1.5 text-sm',
    };

    const variants: Record<BadgeVariant, string> = {
      default: 'bg-neutral-100 text-neutral-800',
      primary: 'bg-brand-50 text-brand-700 border border-brand-100',
      secondary: 'bg-neutral-100 text-neutral-700 border border-neutral-200',
      success: 'bg-success-50 text-success-700 border border-success-100',
      warning: 'bg-warning-50 text-warning-700 border border-warning-200',
      error: 'bg-danger-50 text-danger-700 border border-danger-100',
      info: 'bg-info-50 text-info-700 border border-info-100',
    };

    const roundedClasses: Record<string, string> = {
      sm: 'rounded',
      md: 'rounded-md',
      full: 'rounded-full',
    };

    return `${base} ${sizes[this.size]} ${variants[this.variant]} ${roundedClasses[this.rounded]}`;
  }
}