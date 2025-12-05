import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonComponent } from '../button/button.component';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [CommonModule, ButtonComponent],
  template: `
    <div [class]="getContainerClasses()">
      <!-- Icon -->
      @if (icon) {
        <div [class]="getIconClasses()">
          <ng-content select="[icon]" />
        </div>
      } @else {
        <div [class]="getIconClasses()">
          <svg class="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" 
              d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
        </div>
      }

      <!-- Title -->
      <h3 class="text-lg font-medium text-gray-200">{{ title }}</h3>

      <!-- Description -->
      @if (description) {
        <p class="mt-1 text-sm text-gray-400 max-w-md">{{ description }}</p>
      }

      <!-- Action Button -->
      @if (actionLabel) {
        <div class="mt-6">
          <app-button 
            variant="primary" 
            (click)="action.emit()"
          >
            <ng-content select="[actionIcon]" />
            {{ actionLabel }}
          </app-button>
        </div>
      }

      <!-- Custom Content -->
      <ng-content />
    </div>
  `,
})
export class EmptyStateComponent {
  @Input() title = 'No data found';
  @Input() description = '';
  @Input() icon = false;
  @Input() actionLabel = '';
  @Input() size: 'sm' | 'md' | 'lg' = 'md';

  @Output() action = new EventEmitter<void>();

  getContainerClasses(): string {
    const base = 'flex flex-col items-center justify-center text-center';
    const sizes = {
      sm: 'py-8',
      md: 'py-12',
      lg: 'py-16',
    };
    return `${base} ${sizes[this.size]}`;
  }

  getIconClasses(): string {
    return 'mb-4 text-gray-600';
  }
}