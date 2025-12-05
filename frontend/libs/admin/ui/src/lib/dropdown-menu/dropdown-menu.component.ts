import { Component, Input, Output, EventEmitter, HostListener, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface DropdownMenuItem {
  id: string;
  label: string;
  icon?: string;
  disabled?: boolean;
  danger?: boolean;
  divider?: boolean;
}

@Component({
  selector: 'app-dropdown-menu',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="relative inline-block text-left">
      <!-- Trigger -->
      <button
        type="button"
        (click)="toggle()"
        [class]="getTriggerClasses()"
      >
        <ng-content select="[trigger]" />
        @if (!customTrigger) {
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
              d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
          </svg>
        }
      </button>

      <!-- Dropdown -->
      @if (isOpen) {
        <div 
          [class]="getMenuClasses()"
          role="menu"
        >
          @for (item of items; track item.id) {
            @if (item.divider) {
              <div class="border-t border-gray-700 my-1"></div>
            } @else {
              <button
                type="button"
                [disabled]="item.disabled"
                (click)="selectItem(item)"
                [class]="getItemClasses(item)"
                role="menuitem"
              >
                @if (item.icon) {
                  <span [innerHTML]="item.icon" class="w-4 h-4"></span>
                }
                <span>{{ item.label }}</span>
              </button>
            }
          }
        </div>
      }
    </div>
  `,
})
export class DropdownMenuComponent {
  @Input() items: DropdownMenuItem[] = [];
  @Input() position: 'left' | 'right' = 'right';
  @Input() customTrigger = false;

  @Output() itemClick = new EventEmitter<DropdownMenuItem>();

  isOpen = false;

  constructor(private elementRef: ElementRef) {}

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.isOpen = false;
    }
  }

  toggle(): void {
    this.isOpen = !this.isOpen;
  }

  selectItem(item: DropdownMenuItem): void {
    if (!item.disabled) {
      this.itemClick.emit(item);
      this.isOpen = false;
    }
  }

  getTriggerClasses(): string {
    return 'p-2 text-gray-400 hover:text-gray-300 hover:bg-gray-700 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500/20';
  }

  getMenuClasses(): string {
    const base = 'absolute z-50 mt-2 w-48 rounded-lg bg-gray-800 border border-gray-700 shadow-xl py-1';
    const position = this.position === 'right' ? 'right-0' : 'left-0';
    return `${base} ${position}`;
  }

  getItemClasses(item: DropdownMenuItem): string {
    const base = 'w-full flex items-center gap-2 px-4 py-2 text-sm text-left transition-colors';
    const state = item.disabled
      ? 'text-gray-500 cursor-not-allowed'
      : item.danger
        ? 'text-red-400 hover:bg-red-900/20'
        : 'text-gray-300 hover:bg-gray-700';
    return `${base} ${state}`;
  }
}