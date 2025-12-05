import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModalComponent } from '../modal/modal.component';
import { ModalFooterComponent } from '../modal-footer/modal-footer.component';

export type ConfirmDialogVariant = 'danger' | 'warning' | 'info' | 'success';

interface VariantConfig {
  iconClass: string;
  iconPath: string;
  buttonClass: string;
}

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule, ModalComponent, ModalFooterComponent],
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
      iconClass: 'text-red-600 bg-red-100',
      iconPath: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
      buttonClass: 'bg-red-600 hover:bg-red-700 text-white'
    },
    warning: {
      iconClass: 'text-yellow-600 bg-yellow-100',
      iconPath: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
      buttonClass: 'bg-yellow-600 hover:bg-yellow-700 text-white'
    },
    info: {
      iconClass: 'text-blue-600 bg-blue-100',
      iconPath: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
      buttonClass: 'bg-blue-600 hover:bg-blue-700 text-white'
    },
    success: {
      iconClass: 'text-green-600 bg-green-100',
      iconPath: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
      buttonClass: 'bg-green-600 hover:bg-green-700 text-white'
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