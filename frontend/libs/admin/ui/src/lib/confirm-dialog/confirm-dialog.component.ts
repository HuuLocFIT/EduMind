import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModalComponent } from '../modal/modal.component';

export type ConfirmDialogVariant = 'danger' | 'warning' | 'info' | 'success';

interface VariantConfig {
  iconWrapperClass: string;
  iconClass: string;
  iconPath: string;
  buttonClass: string;
}

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule, ModalComponent],
  templateUrl: './confirm-dialog.component.html',
})
export class ConfirmDialogComponent {
  @Input() isOpen = false;
  @Input() title = 'Confirm Action';
  @Input() message = 'Are you sure you want to proceed?';
  @Input() confirmText = 'Confirm';
  @Input() cancelText = 'Cancel';
  @Input() variant: ConfirmDialogVariant = 'danger';
  @Input() isLoading = false;

  @Output() confirm = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();

  private variantConfigs: Record<ConfirmDialogVariant, VariantConfig> = {
    danger: {
      iconWrapperClass: 'bg-red-50 ring-4 ring-red-100',
      iconClass: 'text-red-600',
      iconPath: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16',
      buttonClass: 'bg-red-600 hover:bg-red-700 focus:ring-red-500 text-white'
    },
    warning: {
      iconWrapperClass: 'bg-yellow-50 ring-4 ring-yellow-100',
      iconClass: 'text-yellow-600',
      iconPath: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
      buttonClass: 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500 text-white'
    },
    info: {
      iconWrapperClass: 'bg-blue-50 ring-4 ring-blue-100',
      iconClass: 'text-blue-600',
      iconPath: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
      buttonClass: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500 text-white'
    },
    success: {
      iconWrapperClass: 'bg-green-50 ring-4 ring-green-100',
      iconClass: 'text-green-600',
      iconPath: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
      buttonClass: 'bg-green-600 hover:bg-green-700 focus:ring-green-500 text-white'
    }
  };

  get config(): VariantConfig {
    return this.variantConfigs[this.variant];
  }

  onConfirm(): void {
    if (!this.isLoading) {
      this.confirm.emit();
    }
  }

  onCancel(): void {
    if (!this.isLoading) {
      this.cancel.emit();
    }
  }
}