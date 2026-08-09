import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-image-upload',
  standalone: true,
  imports: [CommonModule],
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

      <div class="flex items-center gap-4">
        <div
          class="relative w-20 h-20 rounded-xl border border-dashed border-gray-300 bg-gray-50 flex items-center justify-center overflow-hidden flex-shrink-0"
        >
          @if (value) {
            <img [src]="value" alt="Preview" class="w-full h-full object-cover" />
          } @else {
            <svg class="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14M14 8h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          }

          @if (isUploading) {
            <div class="absolute inset-0 bg-white/70 flex items-center justify-center">
              <svg class="animate-spin h-5 w-5 text-brand-600" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                <path
                  class="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            </div>
          }
        </div>

        <div class="flex flex-col gap-1.5">
          <div class="flex items-center gap-3">
            <button
              type="button"
              class="text-sm font-medium text-brand-600 hover:text-brand-700 disabled:opacity-50 disabled:cursor-not-allowed"
              [disabled]="disabled || isUploading"
              (click)="fileInput.click()"
            >
              {{ value ? 'Change image' : 'Upload image' }}
            </button>
            @if (value && !isUploading) {
              <button
                type="button"
                class="text-sm font-medium text-red-500 hover:text-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                [disabled]="disabled"
                (click)="clear()"
              >
                Remove
              </button>
            }
          </div>

          <input
            #fileInput
            [id]="inputId"
            type="file"
            class="hidden"
            [accept]="accept"
            [disabled]="disabled || isUploading"
            (change)="onFileChange($event)"
          />

          @if (helperText && !error && !validationError()) {
            <p class="text-sm text-gray-500">{{ helperText }}</p>
          }
        </div>
      </div>

      @if (error || validationError()) {
        <p class="text-sm text-red-400 mt-1">{{ error || validationError() }}</p>
      }
    </div>
  `,
})
export class ImageUploadComponent {
  @Input() label = '';
  @Input() helperText = '';
  @Input() error = '';
  @Input() required = false;
  @Input() disabled = false;
  @Input() isUploading = false;
  @Input() fullWidth = false;
  @Input() value: string | null = null;
  @Input() accept = 'image/png,image/jpeg,image/jpg,image/webp';
  @Input() maxSizeMB = 5;
  @Input() inputId = `image-upload-${Math.random().toString(36).substring(7)}`;

  @Output() valueChange = new EventEmitter<string | null>();
  @Output() fileSelected = new EventEmitter<File>();

  validationError = signal('');

  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    input.value = '';
    if (!file) return;

    this.validationError.set('');

    const allowedTypes = this.accept
      .split(',')
      .map((type) => type.trim())
      .filter(Boolean);
    if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
      this.validationError.set('Unsupported file type');
      return;
    }

    if (file.size > this.maxSizeMB * 1024 * 1024) {
      this.validationError.set(`File must not exceed ${this.maxSizeMB}MB`);
      return;
    }

    this.fileSelected.emit(file);
  }

  clear(): void {
    this.value = null;
    this.valueChange.emit(null);
  }
}
