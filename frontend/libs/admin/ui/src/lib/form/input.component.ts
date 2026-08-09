import { Component, Input, forwardRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, FormsModule } from '@angular/forms';

@Component({
  selector: 'app-input',
  standalone: true,
  imports: [CommonModule, FormsModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => InputComponent),
      multi: true,
    },
  ],
  template: `
    <div [class]="fullWidth ? 'w-full' : ''">
      @if (label) {
        <label [for]="inputId" class="block text-sm font-medium text-gray-700 mb-1">
          {{ label }}
          @if (required) {
            <span class="text-red-400 ml-1">*</span>
          }
        </label>
      }

      <div class="relative">
        @if (leftIcon) {
          <div class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            <ng-content select="[leftIcon]" />
          </div>
        }

        <input
          [id]="inputId"
          [type]="type"
          [placeholder]="placeholder"
          [disabled]="disabled"
          [required]="required"
          [(ngModel)]="value"
          (ngModelChange)="onValueChange($event)"
          (blur)="onTouched()"
          [class]="getInputClasses()"
          [attr.aria-invalid]="error ? 'true' : null"
          [attr.aria-describedby]="error ? inputId + '-error' : null"
        />

        @if (rightIcon) {
          <div class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
            <ng-content select="[rightIcon]" />
          </div>
        }
      </div>

      @if (error) {
        <p [id]="inputId + '-error'" class="text-sm text-red-400 mt-1">
          {{ error }}
        </p>
      }

      @if (helperText && !error) {
        <p class="text-sm text-gray-500 mt-1">{{ helperText }}</p>
      }
    </div>
  `,
})
export class InputComponent implements ControlValueAccessor {
  @Input() label = '';
  @Input() placeholder = '';
  @Input() type = 'text';
  @Input() error = '';
  @Input() helperText = '';
  @Input() required = false;
  @Input() disabled = false;
  @Input() fullWidth = false;
  @Input() leftIcon = false;
  @Input() rightIcon = false;
  @Input() inputId = `input-${Math.random().toString(36).substring(7)}`;

  value = '';
  onChange: (value: string) => void = () => {};
  onTouched: () => void = () => {};

  getInputClasses(): string {
    const baseClasses = [
      'w-full px-4 py-2.5 border rounded-xl transition-all duration-200 shadow-sm bg-white',
      'text-sm text-gray-900 placeholder-gray-400',
      'focus:outline-none focus:ring-2',
      this.leftIcon ? 'pl-10' : '',
      this.rightIcon ? 'pr-10' : '',
      this.disabled ? 'opacity-60 cursor-not-allowed' : '',
    ];

    const stateClasses = this.error
      ? ['border-red-400 focus:ring-red-500/20 focus:border-red-400']
      : ['border-gray-200 hover:border-gray-300 focus:ring-brand-500/20 focus:border-brand-400'];

    return [...baseClasses, ...stateClasses].filter(Boolean).join(' ');
  }

  onValueChange(value: string): void {
    this.value = value;
    this.onChange(value);
  }

  writeValue(value: string): void {
    this.value = value || '';
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }
}