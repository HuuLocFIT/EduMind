import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardComponent } from './card.component';

@Component({
  selector: 'app-stat-card',
  standalone: true,
  imports: [CommonModule, CardComponent],
  template: `
    <app-card variant="elevated" padding="md">
      <div class="flex items-start justify-between">
        <div class="flex-1">
          <p class="text-sm font-medium text-gray-400">{{ title }}</p>
          <p class="text-3xl font-bold text-white mt-2">{{ value }}</p>

          @if (change) {
            <div class="flex items-center gap-1 mt-2">
              <span
                [class]="
                  change.trend === 'up'
                    ? 'text-green-400'
                    : 'text-red-400'
                "
                class="text-sm font-medium"
              >
                {{ change.trend === 'up' ? '↑' : '↓' }} {{ Math.abs(change.value) }}%
              </span>
              <span class="text-sm text-gray-400">vs last month</span>
            </div>
          }
        </div>

        @if (icon) {
          <div class="flex-shrink-0 w-12 h-12 bg-purple-900/50 rounded-lg flex items-center justify-center text-purple-400">
            <ng-content select="[icon]" />
          </div>
        }
      </div>
    </app-card>
  `,
})
export class StatCardComponent {
  @Input() title!: string;
  @Input() value!: string | number;
  @Input() change?: { value: number; trend: 'up' | 'down' };
  @Input() icon = false;

  Math = Math;
}