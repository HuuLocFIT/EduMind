import { Component, Input, forwardRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, FormsModule } from '@angular/forms';

@Component({
  selector: 'app-textarea',
  standalone: true,
  imports: [CommonModule, FormsModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => TextareaComponent),
      multi: true,
    },
  ],
  template: `
    <div [class]="fullWidth ? 'w-full' : ''">
      @if (label) {
        <label class="block text-sm font-medium text-gray-700 mb-1">
          {{ label }}
          @if (required) {
            <span class="text-red-400 ml-1">*</span>
          }
        </label>
      }

      <textarea
        [placeholder]="placeholder"
        [disabled]="disabled"
        [required]="required"
        [rows]="rows"
        [(ngModel)]="value"
        (ngModelChange)="onValueChange($event)"
        (blur)="onTouched()"
        [class]="getTextareaClasses()"
        [attr.aria-invalid]="error ? 'true' : null"
        [attr.aria-describedby]="error ? textareaId + '-error' : null"
      ></textarea>

      @if (error) {
        <p [id]="textareaId + '-error'" class="text-sm text-red-400 mt-1">
          {{ error }}
        </p>
      }

      @if (helperText && !error) {
        <p class="text-sm text-gray-500 mt-1">{{ helperText }}</p>
      }
    </div>
  `,
})
export class TextareaComponent implements ControlValueAccessor {
  @Input() label = '';
  @Input() placeholder = '';
  @Input() error = '';
  @Input() helperText = '';
  @Input() required = false;
  @Input() disabled = false;
  @Input() fullWidth = false;
  @Input() rows = 3;
  @Input() textareaId = `textarea-${Math.random().toString(36).substring(7)}`;

  value = '';
  onChange: (value: string) => void = () => {};
  onTouched: () => void = () => {};

  getTextareaClasses(): string {
    return [
      'w-full px-4 py-2.5 border rounded-lg transition-all duration-200 resize-none',
      'bg-white text-gray-900 placeholder-gray-400',
      'focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-400',
      this.error ? 'border-red-500 focus:ring-red-500' : 'border-gray-200',
      this.disabled ? 'opacity-60 cursor-not-allowed' : '',
    ]
      .filter(Boolean)
      .join(' ');
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