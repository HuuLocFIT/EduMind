import { Component, Input, Output, EventEmitter, ContentChild, TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface TableColumn<T = unknown> {
  key: string;
  header: string;
  sortable?: boolean;
  width?: string;
  align?: 'left' | 'center' | 'right';
  /** Freeze column while horizontal scrolling */
  sticky?: 'left' | 'right';
  /** Offset for sticky column to avoid overlap (e.g., '80px') */
  stickyOffset?: string;
  template?: TemplateRef<{ $implicit: T; row: T; index: number }>;
}

export interface SortEvent {
  column: string;
  direction: 'asc' | 'desc' | null;
}

export interface PageEvent {
  page: number;
  pageSize: number;
}

@Component({
  selector: 'app-data-table',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
      <!-- Table -->
      <div class="overflow-x-auto">
        <table class="relative min-w-full table-fixed">
          <!-- Header -->
          <thead class="bg-gray-50 border-b border-gray-200">
            <tr>
              @if (selectable) {
                <th class="w-12 px-4 py-3">
                  <input
                    type="checkbox"
                    [checked]="isAllSelected()"
                    [indeterminate]="isIndeterminate()"
                    (change)="toggleSelectAll()"
                    class="w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500/20"
                  />
                </th>
              }
              @for (column of columns; track column.key) {
                <th 
                  [class]="getHeaderClasses(column)"
                  [style.width]="getColumnWidth(column)"
                  [style.minWidth]="getColumnWidth(column)"
                  [style.maxWidth]="getColumnWidth(column)"
                  [style.left]="column.sticky === 'left' ? (column.stickyOffset || '0px') : null"
                  [style.right]="column.sticky === 'right' ? (column.stickyOffset || '0px') : null"
                  (click)="column.sortable ? onSort(column.key) : null"
                >
                  <div class="flex items-center gap-2 text-gray-600 min-w-0">
                    <span class="font-semibold truncate" [title]="column.header">{{ column.header }}</span>
                    @if (column.sortable) {
                      <span class="text-gray-400 shrink-0">
                        @if (sortColumn === column.key) {
                          @if (sortDirection === 'asc') {
                            <svg class="w-4 h-4 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
                            </svg>
                          } @else {
                            <svg class="w-4 h-4 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                            </svg>
                          }
                        } @else {
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                          </svg>
                        }
                      </span>
                    }
                  </div>
                </th>
              }
              @if (showActions) {
                <th
                  class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider overflow-hidden whitespace-nowrap"
                  [class]="getActionsHeaderClasses()"
                  [style.width]="getActionsColumnWidth()"
                  [style.minWidth]="getActionsColumnWidth()"
                  [style.maxWidth]="getActionsColumnWidth()"
                  [style.left]="actionsSticky === 'left' ? (actionsStickyOffset || '0px') : null"
                  [style.right]="actionsSticky === 'right' ? (actionsStickyOffset || '0px') : null"
                >
                  Actions
                </th>
              }
            </tr>
          </thead>

          <!-- Body -->
          <tbody class="divide-y divide-gray-200 bg-white">
            @if (isLoading) {
              @for (i of getSkeletonRows(); track i) {
                <tr class="animate-pulse">
                  @if (selectable) {
                    <td class="px-4 py-4"><div class="h-4 w-4 bg-gray-200 rounded"></div></td>
                  }
                  @for (column of columns; track column.key) {
                    <td
                      [class]="getCellClasses(column)"
                      [style.width]="getColumnWidth(column)"
                      [style.minWidth]="getColumnWidth(column)"
                      [style.maxWidth]="getColumnWidth(column)"
                      [style.left]="column.sticky === 'left' ? (column.stickyOffset || '0px') : null"
                      [style.right]="column.sticky === 'right' ? (column.stickyOffset || '0px') : null"
                    >
                      <div class="h-4 bg-gray-200 rounded w-3/4"></div>
                    </td>
                  }
                  @if (showActions) {
                    <td
                      class="px-4 py-4 text-center"
                      [class]="getActionsCellClasses()"
                      [style.width]="getActionsColumnWidth()"
                      [style.minWidth]="getActionsColumnWidth()"
                      [style.maxWidth]="getActionsColumnWidth()"
                      [style.left]="actionsSticky === 'left' ? (actionsStickyOffset || '0px') : null"
                      [style.right]="actionsSticky === 'right' ? (actionsStickyOffset || '0px') : null"
                    >
                      @if (actionsSkeletonTemplate) {
                        <ng-container *ngTemplateOutlet="actionsSkeletonTemplate" />
                      } @else {
                        <div class="flex items-center justify-center gap-2">
                          @for (b of getActionsSkeletonBars(); track b) {
                            <div class="h-7 w-14 bg-gray-200 rounded-lg"></div>
                          }
                        </div>
                      }
                    </td>
                  }
                </tr>
              }
            } @else if (data.length > 0) {
              @for (row of data; track trackByFn ? trackByFn($index, row) : $index; let i = $index) {
                <tr 
                  class="hover:bg-gray-50 transition-colors"
                  [class.bg-brand-50]="isSelected(row)"
                  (click)="onRowClick(row)"
                >
                  @if (selectable) {
                    <td class="px-4 py-4" (click)="$event.stopPropagation()">
                      <input
                        type="checkbox"
                        [checked]="isSelected(row)"
                        (change)="toggleSelect(row)"
                        class="w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500/20"
                      />
                    </td>
                  }
                  @for (column of columns; track column.key) {
                    <td
                      [class]="getCellClasses(column)"
                      [style.width]="getColumnWidth(column)"
                      [style.minWidth]="getColumnWidth(column)"
                      [style.maxWidth]="getColumnWidth(column)"
                      [style.left]="column.sticky === 'left' ? (column.stickyOffset || '0px') : null"
                      [style.right]="column.sticky === 'right' ? (column.stickyOffset || '0px') : null"
                    >
                      @if (column.template) {
                        <ng-container 
                          *ngTemplateOutlet="column.template; context: { $implicit: row, row: row, index: i }"
                        />
                      } @else {
                        {{ getNestedValue(row, column.key) }}
                      }
                    </td>
                  }
                  @if (showActions) {
                    <td 
                      class="px-4 py-4 text-center"
                      [class]="getActionsCellClasses()"
                      [style.width]="getActionsColumnWidth()"
                      [style.minWidth]="getActionsColumnWidth()"
                      [style.maxWidth]="getActionsColumnWidth()"
                      [style.left]="actionsSticky === 'left' ? (actionsStickyOffset || '0px') : null"
                      [style.right]="actionsSticky === 'right' ? (actionsStickyOffset || '0px') : null"
                      (click)="$event.stopPropagation()"
                    >
                      <ng-content select="[actions]" />
                      <ng-container 
                        *ngTemplateOutlet="actionsTemplate; context: { $implicit: row, row: row, index: i }"
                      />
                    </td>
                  }
                </tr>
              }
            }
          </tbody>
        </table>
      </div>

      @if (!isLoading && data.length === 0) {
        <div class="flex flex-col items-center gap-2 px-4 py-12 text-center text-gray-500 bg-white">
          <svg class="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
              d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
          <span class="text-sm">{{ emptyMessage }}</span>
        </div>
      }

      <!-- Footer with Pagination -->
      @if (showPagination && totalItems > 0) {
        <div class="px-4 py-3 border-t border-gray-200 bg-white flex items-center justify-between">
          <div class="text-sm text-gray-600">
            Showing {{ getStartIndex() }} to {{ getEndIndex() }} of {{ totalItems }} results
          </div>
          <div class="flex items-center gap-2">
            <button
              (click)="onPageChange(currentPage - 1)"
              [disabled]="currentPage === 1"
              class="px-3 py-1.5 text-sm bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            
            @for (page of getPageNumbers(); track page) {
              @if (page === '...') {
                <span class="px-2 text-gray-500">...</span>
              } @else {
                <button
                  (click)="onPageChange(+page)"
                  [class]="page === currentPage
                    ? 'px-3 py-1.5 text-sm bg-brand-600 text-white rounded-lg border border-brand-600'
                    : 'px-3 py-1.5 text-sm bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors'"
                >
                  {{ page }}
                </button>
              }
            }
            
            <button
              (click)="onPageChange(currentPage + 1)"
              [disabled]="currentPage === totalPages"
              class="px-3 py-1.5 text-sm bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      }
    </div>
  `,
})
export class DataTableComponent<T = unknown> {
  @Input() columns: TableColumn<T>[] = [];
  @Input() data: T[] = [];
  @Input() isLoading = false;
  @Input() skeletonRows = 5;
  @Input() emptyMessage = 'No data available';
  @Input() selectable = false;
  @Input() showActions = false;
  @Input() showPagination = true;
  @Input() currentPage = 1;
  @Input() pageSize = 10;
  @Input() totalItems = 0;
  /** Sticky actions column */
  @Input() actionsSticky?: 'left' | 'right';
  @Input() actionsStickyOffset?: string;
  /** Width of actions column */
  @Input() actionsWidth?: string;
  /** Number of skeleton bars to render in the actions column while loading */
  @Input() actionsSkeletonCount = 1;
  @Input() trackByFn?: (index: number, item: T) => unknown;

  @Output() sort = new EventEmitter<SortEvent>();
  @Output() pageChange = new EventEmitter<PageEvent>();
  @Output() selectionChange = new EventEmitter<T[]>();
  @Output() rowClick = new EventEmitter<T>();

  @ContentChild('actions') actionsTemplate!: TemplateRef<{ $implicit: T; row: T; index: number }>;
  /** Optional custom skeleton markup for the actions column while loading (overrides actionsSkeletonCount) */
  @ContentChild('actionsSkeleton') actionsSkeletonTemplate?: TemplateRef<unknown>;

  sortColumn: string | null = null;
  sortDirection: 'asc' | 'desc' | null = null;
  selectedItems: Set<T> = new Set();

  private readonly defaultColumnWidth = '150px';
  private readonly defaultActionsWidth = '160px';

  get totalPages(): number {
    return Math.ceil(this.totalItems / this.pageSize);
  }

  getColumnWidth(column: TableColumn<T>): string {
    return column.width || this.defaultColumnWidth;
  }

  getActionsColumnWidth(): string {
    return this.actionsWidth || this.defaultActionsWidth;
  }

  getHeaderClasses(column: TableColumn<T>): string {
    const base = 'px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-600 overflow-hidden';
    const align = column.align === 'center' ? 'text-center' : column.align === 'right' ? 'text-right' : 'text-left';
    const sortable = column.sortable ? 'cursor-pointer hover:text-gray-800 select-none' : '';
    const sticky = column.sticky ? 'sticky bg-white z-30' : '';
    const shadow = column.sticky === 'left'
      ? 'shadow-[2px_0_4px_-2px_rgba(0,0,0,0.08)]'
      : column.sticky === 'right'
        ? 'shadow-[-2px_0_4px_-2px_rgba(0,0,0,0.08)]'
        : '';
    return `${base} ${align} ${sortable} ${sticky} ${shadow}`;
  }

  getCellClasses(column: TableColumn<T>): string {
    const base = 'px-4 py-4 text-sm text-gray-800 overflow-hidden';
    const align = column.align === 'center' ? 'text-center' : column.align === 'right' ? 'text-right' : 'text-left';
    const sticky = column.sticky ? 'sticky bg-white z-20' : '';
    const shadow = column.sticky === 'left'
      ? 'shadow-[2px_0_4px_-2px_rgba(0,0,0,0.08)]'
      : column.sticky === 'right'
        ? 'shadow-[-2px_0_4px_-2px_rgba(0,0,0,0.08)]'
        : '';
    return `${base} ${align} ${sticky} ${shadow}`;
  }

  getActionsHeaderClasses(): string {
    const sticky = this.actionsSticky ? 'sticky bg-white z-20' : '';
    const shadow = this.actionsSticky === 'left'
      ? 'shadow-[2px_0_4px_-2px_rgba(0,0,0,0.08)]'
      : this.actionsSticky === 'right'
        ? 'shadow-[-2px_0_4px_-2px_rgba(0,0,0,0.08)]'
        : '';
    return `${sticky} ${shadow}`;
  }

  getActionsCellClasses(): string {
    const sticky = this.actionsSticky ? 'sticky bg-white z-10 focus-within:z-40' : '';
    const shadow = this.actionsSticky === 'left'
      ? 'shadow-[2px_0_4px_-2px_rgba(0,0,0,0.08)]'
      : this.actionsSticky === 'right'
        ? 'shadow-[-2px_0_4px_-2px_rgba(0,0,0,0.08)]'
        : '';
    return `${sticky} ${shadow}`;
  }

  getSkeletonRows(): number[] {
    return Array.from({ length: this.skeletonRows }, (_, i) => i);
  }

  getActionsSkeletonBars(): number[] {
    return Array.from({ length: this.actionsSkeletonCount }, (_, i) => i);
  }

  getNestedValue(obj: T, path: string): unknown {
    return path.split('.').reduce((o: unknown, p) => (o as Record<string, unknown>)?.[p], obj);
  }

  onSort(column: string): void {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : this.sortDirection === 'desc' ? null : 'asc';
      if (!this.sortDirection) this.sortColumn = null;
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }
    this.sort.emit({ column: this.sortColumn || column, direction: this.sortDirection });
  }

  onPageChange(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.pageChange.emit({ page, pageSize: this.pageSize });
    }
  }

  onRowClick(row: T): void {
    this.rowClick.emit(row);
  }

  // Selection methods
  isSelected(row: T): boolean {
    return this.selectedItems.has(row);
  }

  isAllSelected(): boolean {
    return this.data.length > 0 && this.data.every(row => this.selectedItems.has(row));
  }

  isIndeterminate(): boolean {
    const selectedCount = this.data.filter(row => this.selectedItems.has(row)).length;
    return selectedCount > 0 && selectedCount < this.data.length;
  }

  toggleSelect(row: T): void {
    if (this.selectedItems.has(row)) {
      this.selectedItems.delete(row);
    } else {
      this.selectedItems.add(row);
    }
    this.selectionChange.emit(Array.from(this.selectedItems));
  }

  toggleSelectAll(): void {
    if (this.isAllSelected()) {
      this.data.forEach(row => this.selectedItems.delete(row));
    } else {
      this.data.forEach(row => this.selectedItems.add(row));
    }
    this.selectionChange.emit(Array.from(this.selectedItems));
  }

  // Pagination helpers
  getStartIndex(): number {
    return (this.currentPage - 1) * this.pageSize + 1;
  }

  getEndIndex(): number {
    return Math.min(this.currentPage * this.pageSize, this.totalItems);
  }

  getPageNumbers(): (number | string)[] {
    const pages: (number | string)[] = [];
    const total = this.totalPages;
    const current = this.currentPage;

    if (total <= 7) {
      for (let i = 1; i <= total; i++) pages.push(i);
    } else {
      if (current <= 3) {
        pages.push(1, 2, 3, 4, '...', total);
      } else if (current >= total - 2) {
        pages.push(1, '...', total - 3, total - 2, total - 1, total);
      } else {
        pages.push(1, '...', current - 1, current, current + 1, '...', total);
      }
    }
    return pages;
  }
}