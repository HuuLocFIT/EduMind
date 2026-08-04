import { Component, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Accent tone for a stat card. Drives the left border and the icon surface.
 * Classes are declared statically so Tailwind's content scanner can see them.
 */
export type StatCardTone =
  | 'neutral'
  | 'brand'
  | 'accent'
  | 'info'
  | 'success'
  | 'warning'
  | 'danger';

export type StatCardRightSlot = 'icon' | 'aside' | 'none';

export interface StatCardTrend {
  /** Magnitude of the change, already absolute. */
  value: number;
  isPositive: boolean;
  /** Trailing copy after the percentage, e.g. "vs last month". */
  suffix?: string;
}

interface ToneClasses {
  border: string;
  iconSurface: string;
  iconText: string;
  value: string;
}

const TONE_CLASSES: Record<StatCardTone, ToneClasses> = {
  neutral: {
    border: 'border-l-neutral-200',
    iconSurface: 'bg-neutral-100',
    iconText: 'text-neutral-600',
    value: 'text-neutral-900',
  },
  brand: {
    border: 'border-l-brand-500',
    iconSurface: 'bg-brand-50',
    iconText: 'text-brand-600',
    value: 'text-brand-600',
  },
  accent: {
    border: 'border-l-accent-500',
    iconSurface: 'bg-accent-50',
    iconText: 'text-accent-600',
    value: 'text-accent-600',
  },
  info: {
    border: 'border-l-info-500',
    iconSurface: 'bg-info-50',
    iconText: 'text-info-600',
    value: 'text-info-600',
  },
  success: {
    border: 'border-l-success-500',
    iconSurface: 'bg-success-50',
    iconText: 'text-success-600',
    value: 'text-success-600',
  },
  warning: {
    border: 'border-l-warning-500',
    iconSurface: 'bg-warning-50',
    iconText: 'text-warning-600',
    value: 'text-warning-600',
  },
  danger: {
    border: 'border-l-danger-500',
    iconSurface: 'bg-danger-50',
    iconText: 'text-danger-600',
    value: 'text-danger-600',
  },
};

const SHELL_CLASSES =
  'h-full rounded-xl border shadow-rest hover:shadow-hover transition-shadow duration-200 p-5 border-l-4';

/**
 * KPI / stat tile used across the admin dashboard and list pages.
 *
 * Content slots:
 * - `[icon]` — svg rendered inside the tinted square on the right
 * - `[aside]` — replaces the icon square entirely (e.g. a status badge)
 * - `[detail]` — rich meta under the value; use instead of `subtitle`/`trend`
 * - `[footer]` — extra line spanning the full card width
 */
@Component({
  selector: 'app-stat-card',
  standalone: true,
  imports: [CommonModule],
  host: { class: 'block h-full' },
  template: `
    @if (loading()) {
      <div [class]="SHELL_CLASSES + ' bg-white border-neutral-200 border-l-neutral-200 animate-pulse'">
        <div class="flex items-start justify-between gap-3">
          <div class="flex-1">
            <div class="h-3 bg-neutral-200 rounded w-28"></div>
            <div class="h-9 bg-neutral-200 rounded w-24 mt-3"></div>
            <div class="h-3 bg-neutral-200 rounded w-40 mt-2.5"></div>
          </div>
          <div class="w-11 h-11 bg-neutral-200 rounded-xl flex-shrink-0"></div>
        </div>
      </div>
    } @else {
      <div [class]="shellClasses()" [attr.data-testid]="testId()">
        <div class="flex items-start justify-between gap-3 text-neutral-900">
          <div class="flex-1 min-w-0">
            <p class="text-xs uppercase tracking-wider text-neutral-500 font-semibold">
              {{ label() }}
            </p>
            <p class="text-3xl font-bold mt-2 tabular-nums" [class]="valueClasses()">
              {{ value() }}
            </p>

            @if (trend()) {
              <p
                class="text-xs mt-1.5 flex items-center gap-1"
                [class]="trend()!.isPositive ? 'text-success-600' : 'text-danger-600'"
              >
                @if (trend()!.isPositive) {
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                  </svg>
                } @else {
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                }
                {{ trend()!.value | number: '1.1-1' }}% {{ trend()!.suffix }}
              </p>
            } @else if (subtitle()) {
              <p class="text-xs text-neutral-400 mt-1.5">{{ subtitle() }}</p>
            }

            <ng-content select="[detail]" />
          </div>

          @if (rightSlot() === 'aside') {
            <div class="flex-shrink-0">
              <ng-content select="[aside]" />
            </div>
          } @else if (rightSlot() === 'icon') {
            <div
              class="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
              [class]="iconSurfaceClasses()"
            >
              <ng-content select="[icon]" />
            </div>
          }
        </div>

        <ng-content select="[footer]" />
      </div>
    }
  `,
})
export class StatCardComponent {
  /** Ignored while `loading`. */
  readonly label = input('');
  /** Ignored while `loading`. `null` accommodates piped values (e.g. `| number`). */
  readonly value = input<string | number | null>('');
  readonly subtitle = input<string>();
  readonly tone = input<StatCardTone>('neutral');
  /** Colour the value with the tone instead of `neutral-900`. */
  readonly tintValue = input(false);
  /** Renders in place of `subtitle` when provided. */
  readonly trend = input<StatCardTrend>();
  readonly loading = input(false);
  /**
   * What sits to the right of the numbers: the tinted `[icon]` square (default),
   * a fully custom `[aside]` slot (e.g. a badge), or nothing.
   */
  readonly rightSlot = input<StatCardRightSlot>('icon');
  readonly testId = input<string | undefined>(undefined);

  protected readonly SHELL_CLASSES = SHELL_CLASSES;

  private readonly toneClasses = computed(() => TONE_CLASSES[this.tone()]);

  protected readonly shellClasses = computed(
    () => `${SHELL_CLASSES} bg-white border-neutral-200 ${this.toneClasses().border}`,
  );

  protected readonly valueClasses = computed(() =>
    this.tintValue() ? this.toneClasses().value : 'text-neutral-900',
  );

  protected readonly iconSurfaceClasses = computed(() => {
    const tone = this.toneClasses();
    return `${tone.iconSurface} ${tone.iconText}`;
  });
}
