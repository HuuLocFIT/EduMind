import {
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  Output,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { SelectOption } from '../select/select.component';

@Component({
  selector: 'app-multi-select',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="relative">
      @if (label) {
        <span class="block text-sm font-medium text-gray-700 mb-1.5">{{ label }}</span>
      }

      <button
        type="button"
        (click)="toggleDropdown($event)"
        [class]="getTriggerClasses()"
      >
        <span class="truncate">
          {{ selectedValues().length === 0 ? placeholder : selectedValues().length + ' selected' }}
        </span>
        <svg class="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      @if (isOpen()) {
        <div class="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          @if (selectedValues().length > 0) {
            <div class="px-3 py-2 border-b border-gray-100 flex justify-end">
              <button
                type="button"
                (click)="clearAll($event)"
                class="text-xs text-brand-600 hover:text-brand-800 font-medium"
              >
                Clear
              </button>
            </div>
          }
          @for (option of options; track option.value) {
            <label class="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-gray-50 text-sm text-gray-700">
              <input
                type="checkbox"
                [checked]="isSelected(option.value)"
                (change)="toggleOption(option.value)"
                class="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
              />
              {{ option.label }}
            </label>
          }
        </div>
      }
    </div>
  `,
})
export class MultiSelectComponent {
  @Input() label = '';
  @Input() placeholder = 'Select options';
  @Input() options: SelectOption[] = [];
  @Input() size: 'sm' | 'md' | 'lg' = 'md';

  @Output() selectionChange = new EventEmitter<(string | number)[]>();

  isOpen = signal(false);
  selectedValues = signal<(string | number)[]>([]);

  private elementRef = inject(ElementRef);

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.isOpen.set(false);
    }
  }

  toggleDropdown(event: MouseEvent): void {
    event.stopPropagation();
    this.isOpen.update((v) => !v);
  }

  isSelected(value: string | number): boolean {
    return this.selectedValues().includes(value);
  }

  toggleOption(value: string | number): void {
    const current = this.selectedValues();
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    this.selectedValues.set(next);
    this.selectionChange.emit(next);
  }

  clearAll(event: MouseEvent): void {
    event.stopPropagation();
    this.selectedValues.set([]);
    this.selectionChange.emit([]);
  }

  getTriggerClasses(): string {
    const base =
      'flex items-center justify-between gap-2 w-full bg-white border text-gray-900 rounded-lg shadow-sm focus:outline-none focus:ring-2 transition-colors cursor-pointer border-gray-300 focus:ring-brand-500/20 focus:border-brand-500 hover:border-gray-400';
    const sizes: Record<string, string> = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2.5 text-md',
      lg: 'px-4 py-3 text-base',
    };
    return `${base} ${sizes[this.size]}`;
  }
}
