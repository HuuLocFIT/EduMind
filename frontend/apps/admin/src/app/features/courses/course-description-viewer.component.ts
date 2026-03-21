import { CommonModule } from '@angular/common';
import { Component, computed, input } from '@angular/core';

@Component({
  selector: 'app-course-description-viewer',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (renderedDescription()) {
      <div class="article-viewer__content min-w-0" [innerHTML]="renderedDescription()"></div>
    } @else {
      <p class="text-sm text-gray-600">No description</p>
    }
  `,
})
export class CourseDescriptionViewerComponent {
  description = input<string | null | undefined>('');

  renderedDescription = computed(() => {
    const content = (this.description() ?? '').trim();

    if (!content) {
      return '';
    }

    if (this.looksLikeHtml(content)) {
      return content;
    }

    return content
      .split(/\r?\n+/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => `<p>${this.escapeHtml(line)}</p>`)
      .join('');
  });

  private looksLikeHtml(content: string): boolean {
    return /<\/?[a-z][\s\S]*>/i.test(content);
  }

  private escapeHtml(content: string): string {
    return content
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}
