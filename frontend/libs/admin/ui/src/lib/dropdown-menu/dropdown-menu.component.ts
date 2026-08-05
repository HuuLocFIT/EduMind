import { Component, Input, Output, EventEmitter, HostListener, ElementRef, ViewChild, Renderer2, OnDestroy, inject } from '@angular/core';
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
    <div class="inline-block" #triggerWrapper>
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
    </div>

    <!-- Dropdown: rendered here but moved to document.body once created, so it escapes
         any ancestor's overflow clipping (e.g. a scrollable table wrapper). -->
    @if (isOpen) {
      <div
        #menuRef
        [class]="getMenuClasses()"
        [style.top.px]="menuTop"
        [style.left.px]="menuLeft"
        role="menu"
      >
        @for (item of items; track item.id) {
          @if (item.divider) {
            <div class="border-t border-gray-200 my-1"></div>
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
  `,
})
export class DropdownMenuComponent implements OnDestroy {
  @Input() items: DropdownMenuItem[] = [];
  @Input() position: 'left' | 'right' = 'right';
  @Input() customTrigger = false;

  @Output() itemClick = new EventEmitter<DropdownMenuItem>();

  isOpen = false;
  menuTop = 0;
  menuLeft = 0;

  @ViewChild('triggerWrapper', { static: true }) triggerWrapper!: ElementRef<HTMLDivElement>;

  @ViewChild('menuRef') set menuRefSetter(ref: ElementRef<HTMLDivElement> | undefined) {
    if (ref) {
      this.attachMenuToBody(ref.nativeElement);
    }
  }

  private elementRef = inject(ElementRef);
  private renderer = inject(Renderer2);
  private menuEl: HTMLDivElement | null = null;
  private readonly onScrollCapture = () => this.close();

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as Node;
    const clickedTrigger = this.elementRef.nativeElement.contains(target);
    const clickedMenu = this.menuEl?.contains(target) ?? false;
    if (!clickedTrigger && !clickedMenu) {
      this.close();
    }
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    if (this.isOpen) {
      this.updatePosition();
    }
  }

  toggle(): void {
    if (this.isOpen) {
      this.close();
    } else {
      // Compute an initial position before the view renders, so the first
      // paint already lands in the right place instead of flashing at (0,0)
      // (menuTop/menuLeft's default) for one frame. attachMenuToBody() below
      // refines this once the menu's real width is measurable.
      this.updatePositionFromTrigger();
      this.isOpen = true;
    }
  }

  selectItem(item: DropdownMenuItem): void {
    if (!item.disabled) {
      this.itemClick.emit(item);
      this.close();
    }
  }

  private attachMenuToBody(menuNativeEl: HTMLDivElement): void {
    this.menuEl = menuNativeEl;
    this.renderer.appendChild(document.body, menuNativeEl);
    this.updatePosition();
    // capture: true catches scroll on any nested scrollable ancestor (e.g. the
    // table's overflow-x-auto wrapper), which don't bubble as normal scroll events.
    window.addEventListener('scroll', this.onScrollCapture, true);
  }

  /** Estimated position using only the trigger's rect (menu width isn't measurable yet). */
  private updatePositionFromTrigger(): void {
    const triggerRect = this.triggerWrapper.nativeElement.getBoundingClientRect();
    const assumedMenuWidth = 192; // w-48
    this.menuTop = triggerRect.bottom + 8;
    this.menuLeft = this.position === 'right'
      ? triggerRect.right - assumedMenuWidth
      : triggerRect.left;
  }

  /** Refines the position once the menu is in the DOM and its real width is measurable. */
  private updatePosition(): void {
    if (!this.menuEl) {
      return;
    }
    const triggerRect = this.triggerWrapper.nativeElement.getBoundingClientRect();
    const menuRect = this.menuEl.getBoundingClientRect();
    this.menuTop = triggerRect.bottom + 8;
    this.menuLeft = this.position === 'right'
      ? triggerRect.right - menuRect.width
      : triggerRect.left;
  }

  private close(): void {
    this.isOpen = false;
    if (this.menuEl) {
      this.menuEl.remove();
      this.menuEl = null;
      window.removeEventListener('scroll', this.onScrollCapture, true);
    }
  }

  getTriggerClasses(): string {
    return 'p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500/20';
  }

  getMenuClasses(): string {
    return 'fixed z-50 w-48 rounded-lg bg-white border border-gray-200 shadow-lg py-1';
  }

  getItemClasses(item: DropdownMenuItem): string {
    const base = 'w-full flex items-center gap-2 px-4 py-2 text-sm text-left transition-colors';
    const state = item.disabled
      ? 'text-gray-400 cursor-not-allowed'
      : item.danger
        ? 'text-red-600 hover:bg-red-50'
        : 'text-gray-700 hover:bg-gray-50';
    return `${base} ${state}`;
  }

  ngOnDestroy(): void {
    this.close();
  }
}
