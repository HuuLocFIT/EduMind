import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface Tab {
  id: string;
  label: string;
  icon?: string;
  disabled?: boolean;
  badge?: string | number;
}

@Component({
  selector: 'app-tabs',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div>
      <!-- Tab List -->
      <div [class]="getTabListClasses()">
        @for (tab of tabs; track tab.id) {
          <button
            type="button"
            [disabled]="tab.disabled"
            (click)="selectTab(tab.id)"
            [class]="getTabClasses(tab.id)"
          >
            @if (tab.icon) {
              <span [innerHTML]="tab.icon"></span>
            }
            <span>{{ tab.label }}</span>
            @if (tab.badge !== undefined) {
              <span class="ml-2 px-2 py-0.5 text-xs rounded-full bg-purple-600 text-white">
                {{ tab.badge }}
              </span>
            }
          </button>
        }
      </div>

      <!-- Tab Content -->
      <div class="mt-4">
        <ng-content />
      </div>
    </div>
  `,
})
export class TabsComponent {
  @Input() tabs: Tab[] = [];
  @Input() activeTab = '';
  @Input() variant: 'default' | 'pills' | 'underline' = 'default';
  @Input() fullWidth = false;

  @Output() tabChange = new EventEmitter<string>();

  selectTab(tabId: string): void {
    const tab = this.tabs.find(t => t.id === tabId);
    if (tab && !tab.disabled) {
      this.activeTab = tabId;
      this.tabChange.emit(tabId);
    }
  }

  getTabListClasses(): string {
    const base = 'flex';
    const variants = {
      default: 'border-b border-gray-700 gap-0',
      pills: 'bg-gray-800 rounded-lg p-1 gap-1',
      underline: 'border-b border-gray-700 gap-4',
    };
    const width = this.fullWidth ? 'w-full' : '';
    return `${base} ${variants[this.variant]} ${width}`;
  }

  getTabClasses(tabId: string): string {
    const isActive = this.activeTab === tabId;
    const base = 'flex items-center gap-2 font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed';
    
    const variants = {
      default: isActive
        ? 'px-4 py-3 text-sm text-purple-400 border-b-2 border-purple-500 -mb-px bg-gray-800/50'
        : 'px-4 py-3 text-sm text-gray-400 hover:text-gray-300 border-b-2 border-transparent -mb-px',
      pills: isActive
        ? 'px-4 py-2 text-sm text-white bg-purple-600 rounded-md'
        : 'px-4 py-2 text-sm text-gray-400 hover:text-gray-300 hover:bg-gray-700 rounded-md',
      underline: isActive
        ? 'pb-3 text-sm text-purple-400 border-b-2 border-purple-500 -mb-px'
        : 'pb-3 text-sm text-gray-400 hover:text-gray-300 border-b-2 border-transparent -mb-px',
    };

    const width = this.fullWidth ? 'flex-1 justify-center' : '';
    return `${base} ${variants[this.variant]} ${width}`;
  }
}