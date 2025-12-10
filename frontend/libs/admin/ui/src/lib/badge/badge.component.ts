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
      default: 'bg-gray-100 text-gray-800',
      primary: 'bg-indigo-50 text-indigo-700 border border-indigo-100',
      secondary: 'bg-gray-100 text-gray-700 border border-gray-200',
      success: 'bg-green-50 text-green-700 border border-green-100',
      warning: 'bg-yellow-50 text-yellow-700 border border-yellow-200',
      error: 'bg-red-50 text-red-700 border border-red-100',
      info: 'bg-blue-50 text-blue-700 border border-blue-100',
    };

    const roundedClasses: Record<string, string> = {
      sm: 'rounded',
      md: 'rounded-md',
      full: 'rounded-full',
    };

    return `${base} ${sizes[this.size]} ${variants[this.variant]} ${roundedClasses[this.rounded]}`;
  }
}