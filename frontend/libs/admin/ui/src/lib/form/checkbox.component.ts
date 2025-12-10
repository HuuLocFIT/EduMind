import { Component, Input, forwardRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, FormsModule } from '@angular/forms';

@Component({
  selector: 'app-checkbox',
  standalone: true,
  imports: [CommonModule, FormsModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => CheckboxComponent),
      multi: true,
    },
  ],
  template: `
    <div class="flex flex-col gap-1">
      <div class="flex items-start gap-2">
        <input
          type="checkbox"
          [id]="checkboxId"
          [disabled]="disabled"
          [(ngModel)]="checked"
          (ngModelChange)="onValueChange($event)"
          (blur)="onTouched()"
          class="w-4 h-4 mt-0.5 rounded border-gray-300 bg-white text-indigo-600 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-0 transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          [attr.aria-invalid]="error ? 'true' : null"
          [attr.aria-describedby]="error ? checkboxId + '-error' : null"
        />

        @if (label) {
          <label
            [for]="checkboxId"
            class="text-sm text-gray-800 cursor-pointer select-none"
            [class.opacity-50]="disabled"
            [class.cursor-not-allowed]="disabled"
          >
            {{ label }}
          </label>
        }
      </div>

      @if (error) {
        <p [id]="checkboxId + '-error'" class="text-sm text-red-500 ml-6">
          {{ error }}
        </p>
      }
    </div>
  `,
})
export class CheckboxComponent implements ControlValueAccessor {
  @Input() label = '';
  @Input() error = '';
  @Input() disabled = false;
  @Input() checkboxId = `checkbox-${Math.random().toString(36).substring(7)}`;

  checked = false;
  onChange: (value: boolean) => void = () => {};
  onTouched: () => void = () => {};

  onValueChange(value: boolean): void {
    this.checked = value;
    this.onChange(value);
  }

  writeValue(value: boolean): void {
    this.checked = value || false;
  }

  registerOnChange(fn: (value: boolean) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }
}