import { Component, Input, forwardRef, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

export interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

@Component({
  selector: 'app-select',
  standalone: true,
  imports: [CommonModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SelectComponent),
      multi: true,
    },
  ],
  template: `
    <div class="relative">
      @if (label) {
        <label [for]="id" class="block text-sm font-medium text-gray-700 mb-1.5">
          {{ label }}
          @if (required) {
            <span class="text-red-500">*</span>
          }
        </label>
      }

      <div class="relative">
        <select
          [id]="id"
          [value]="value()"
          [disabled]="disabled"
          (change)="onSelectChange($event)"
          (blur)="onTouched()"
          [class]="getSelectClasses()"
        >
          @if (placeholder) {
            <option value="" disabled [selected]="!value()">
              {{ placeholder }}
            </option>
          }
          @for (option of options; track option.value) {
            <option 
              [value]="option.value" 
              [disabled]="option.disabled"
            >
              {{ option.label }}
            </option>
          }
        </select>

        <!-- Dropdown Icon -->
        <div class="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
          <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      @if (error) {
        <p class="mt-1.5 text-sm text-red-500">{{ error }}</p>
      }
      @if (helperText && !error) {
        <p class="mt-1.5 text-sm text-gray-500">{{ helperText }}</p>
      }
    </div>
  `,
})
export class SelectComponent implements ControlValueAccessor {
  @Input() id = `select-${Math.random().toString(36).slice(2, 9)}`;
  @Input() label = '';
  @Input() placeholder = 'Select an option';
  @Input() options: SelectOption[] = [];
  @Input() error = '';
  @Input() helperText = '';
  @Input() required = false;
  @Input() disabled = false;
  @Input() fullWidth = true;
  @Input() size: 'sm' | 'md' | 'lg' = 'md';

  value = signal<string | number>('');

  onChange: (value: string | number) => void = () => {};
  onTouched: () => void = () => {};

  writeValue(val: string | number): void {
    this.value.set(val ?? '');
  }

  registerOnChange(fn: (value: string | number) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  onSelectChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const newValue = target.value;
    this.value.set(newValue);
    this.onChange(newValue);
  }

  getSelectClasses(): string {
    const base =
      'block appearance-none bg-white border text-gray-900 placeholder-gray-400 rounded-lg shadow-sm focus:outline-none focus:ring-2 transition-colors cursor-pointer pr-10';

    const sizes = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2.5 text-md',
      lg: 'px-4 py-3 text-base',
    };

    const states = this.error
      ? 'border-red-500 focus:ring-red-500/20 focus:border-red-500'
      : 'border-gray-300 focus:ring-indigo-500/20 focus:border-indigo-500 hover:border-gray-400';

    const width = this.fullWidth ? 'w-full' : '';
    const disabledClass = this.disabled ? 'opacity-50 cursor-not-allowed' : '';

    return `${base} ${sizes[this.size]} ${states} ${width} ${disabledClass}`;
  }
}