import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-modal-footer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div [class]="'flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50 ' + className">
      <ng-content></ng-content>
    </div>
  `
})
export class ModalFooterComponent {
  @Input() className = '';
}