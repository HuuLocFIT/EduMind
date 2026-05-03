import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './modal.component.html',
  styleUrls: ['./modal.component.css'],
  host: {
    '[attr.title]': 'null',
  },
})
export class ModalComponent implements OnInit, OnDestroy, OnChanges {
  @Input() isOpen = false;
  @Input() title?: string;
  @Input() size: ModalSize = 'md';
  @Input() showCloseButton = true;
  @Input() closeOnOverlayClick = true;
  @Input() closeOnEscape = true;
  
  // eslint-disable-next-line @angular-eslint/no-output-native
  @Output() close = new EventEmitter<void>();

  private originalOverflow = '';

  ngOnInit(): void {
    if (this.closeOnEscape) {
      document.addEventListener('keydown', this.handleEscape);
    }
  }

  ngOnDestroy(): void {
    document.removeEventListener('keydown', this.handleEscape);
    this.restoreBodyScroll();
  }

  ngOnChanges(): void {
    if (this.isOpen) {
      this.lockBodyScroll();
    } else {
      this.restoreBodyScroll();
    }
  }

  private handleEscape = (event: KeyboardEvent): void => {
    if (event.key === 'Escape' && this.isOpen && this.closeOnEscape) {
      this.onClose();
    }
  };

  private lockBodyScroll(): void {
    this.originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  }

  private restoreBodyScroll(): void {
    document.body.style.overflow = this.originalOverflow;
  }

  onClose(): void {
    if (!this.isOpen) return;
    this.close.emit();
  }

  onOverlayClick(): void {
    if (this.closeOnOverlayClick) {
      this.onClose();
    }
  }

  getSizeClass(): string {
    const sizes: Record<ModalSize, string> = {
      sm: 'sm:max-w-sm',
      md: 'sm:max-w-md',
      lg: 'sm:max-w-lg',
      xl: 'sm:max-w-xl',
      full: 'sm:max-w-full mx-4'
    };
    return sizes[this.size];
  }
}