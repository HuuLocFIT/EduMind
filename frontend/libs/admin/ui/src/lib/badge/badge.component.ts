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
      default: 'bg-gray-700 text-gray-300',
      primary: 'bg-purple-900/50 text-purple-300 border border-purple-700/50',
      secondary: 'bg-gray-800 text-gray-300 border border-gray-700',
      success: 'bg-green-900/50 text-green-300 border border-green-700/50',
      warning: 'bg-yellow-900/50 text-yellow-300 border border-yellow-700/50',
      error: 'bg-red-900/50 text-red-300 border border-red-700/50',
      info: 'bg-blue-900/50 text-blue-300 border border-blue-700/50',
    };

    const roundedClasses: Record<string, string> = {
      sm: 'rounded',
      md: 'rounded-md',
      full: 'rounded-full',
    };

    return `${base} ${sizes[this.size]} ${variants[this.variant]} ${roundedClasses[this.rounded]}`;
  }
}