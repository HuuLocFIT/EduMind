import { Component, Input, forwardRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, FormsModule } from '@angular/forms';

@Component({
  selector: 'app-switch',
  standalone: true,
  imports: [CommonModule, FormsModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SwitchComponent),
      multi: true,
    },
  ],
  template: `
    <div class="flex items-center gap-3">
      <label class="relative inline-flex items-center cursor-pointer">
        <input
          type="checkbox"
          [disabled]="disabled"
          [(ngModel)]="checked"
          (ngModelChange)="onValueChange($event)"
          (blur)="onTouched()"
          class="sr-only peer"
        />
        <div
          class="w-11 h-6 rounded-full transition-colors duration-200 peer-focus:ring-2 peer-focus:ring-purple-500 peer-focus:ring-offset-2"
          [class.bg-purple-600]="checked"
          [class.bg-gray-300]="!checked"
          [class.opacity-50]="disabled"
          [class.cursor-not-allowed]="disabled"
        >
          <div
            class="absolute top-0.5 left-0.5 bg-white w-5 h-5 rounded-full transition-transform duration-200"
            [class.translate-x-5]="checked"
          ></div>
        </div>
      </label>

      @if (label) {
        <span
          class="text-sm text-gray-800"
          [class.opacity-50]="disabled"
          [class.cursor-not-allowed]="disabled"
        >
          {{ label }}
        </span>
      }
    </div>
  `,
})
export class SwitchComponent implements ControlValueAccessor {
  @Input() label = '';
  @Input() disabled = false;

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