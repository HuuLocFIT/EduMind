import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { debounceTime, Subject } from 'rxjs';

@Component({
  selector: 'app-search-bar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div [class]="getContainerClasses()">
      <div class="relative">
        <!-- Search Icon -->
        <div class="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
          <svg class="w-5 h-5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        <!-- Input -->
        <input
          type="text"
          [placeholder]="placeholder"
          [value]="searchValue()"
          (input)="onInput($event)"
          (keyup.enter)="onSearch()"
          [class]="getInputClasses()"
        />

        <!-- Clear Button -->
        @if (searchValue() && showClear) {
          <button
            type="button"
            (click)="onClear()"
            class="absolute inset-y-0 right-0 flex items-center pr-3 text-neutral-400 hover:text-neutral-600"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        }

        <!-- Loading Spinner -->
        @if (isLoading) {
          <div class="absolute inset-y-0 right-0 flex items-center pr-3">
            <svg class="w-5 h-5 text-brand-500 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
            </svg>
          </div>
        }
      </div>
    </div>
  `,
})
export class SearchBarComponent {
  @Input() placeholder = 'Search...';
  @Input() debounceMs = 300;
  @Input() showClear = true;
  @Input() isLoading = false;
  @Input() fullWidth = true;
  @Input() size: 'sm' | 'md' | 'lg' = 'md';

  // eslint-disable-next-line @angular-eslint/no-output-native
  @Output() search = new EventEmitter<string>();
  @Output() clear = new EventEmitter<void>();

  searchValue = signal('');
  private searchSubject = new Subject<string>();

  constructor() {
    this.searchSubject.pipe(debounceTime(this.debounceMs)).subscribe((value) => {
      this.search.emit(value);
    });
  }

  onInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.searchValue.set(target.value);
    this.searchSubject.next(target.value);
  }

  onSearch(): void {
    this.search.emit(this.searchValue());
  }

  onClear(): void {
    this.searchValue.set('');
    this.search.emit('');
    this.clear.emit();
  }

  getContainerClasses(): string {
    return this.fullWidth ? 'w-full' : 'w-64';
  }

  getInputClasses(): string {
    const base =
      'block w-full bg-white border border-neutral-300 text-neutral-900 placeholder-neutral-400 rounded-lg pl-10 shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 hover:border-neutral-400 transition-colors';
    
    const sizes = {
      sm: 'py-1.5 pr-10 text-sm',
      md: 'py-2.5 pr-10 text-sm',
      lg: 'py-3 pr-10 text-base',
    };

    return `${base} ${sizes[this.size]}`;
  }
}