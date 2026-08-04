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
  // eslint-disable-next-line @angular-eslint/no-output-native
  @Output() cancel = new EventEmitter<void>();

  private variantConfigs: Record<ConfirmDialogVariant, VariantConfig> = {
    danger: {
      iconWrapperClass: 'bg-danger-50 ring-4 ring-danger-100',
      iconClass: 'text-danger-600',
      iconPath: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16',
      buttonClass: 'bg-danger-600 hover:bg-danger-700 focus:ring-danger-500 text-white'
    },
    warning: {
      iconWrapperClass: 'bg-warning-50 ring-4 ring-warning-100',
      iconClass: 'text-warning-600',
      iconPath: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
      buttonClass: 'bg-warning-600 hover:bg-warning-700 focus:ring-warning-500 text-white'
    },
    info: {
      iconWrapperClass: 'bg-info-50 ring-4 ring-info-100',
      iconClass: 'text-info-600',
      iconPath: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
      buttonClass: 'bg-info-600 hover:bg-info-700 focus:ring-info-500 text-white'
    },
    success: {
      iconWrapperClass: 'bg-success-50 ring-4 ring-success-100',
      iconClass: 'text-success-600',
      iconPath: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
      buttonClass: 'bg-success-600 hover:bg-success-700 focus:ring-success-500 text-white'
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