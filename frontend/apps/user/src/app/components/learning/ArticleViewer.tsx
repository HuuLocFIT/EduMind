import React, { useMemo } from 'react';
import DOMPurify from 'dompurify';
import { optimizeArticleImages } from '@edumind/shared-utils';

interface ArticleViewerProps {
  html: string;
  title?: string;
}

function readCodeLanguage(element: HTMLElement): string {
  const candidates: string[] = [];
  const code = element.querySelector('code');
  if (code) {
    candidates.push(code.getAttribute('data-language') ?? '');
    for (const cls of Array.from(code.classList)) {
      if (cls.startsWith('language-')) candidates.push(cls.slice('language-'.length));
    }
  }
  candidates.push(element.getAttribute('data-language') ?? '');
  for (const cls of Array.from(element.classList)) {
    if (cls.startsWith('language-')) candidates.push(cls.slice('language-'.length));
  }
  return candidates.find((c) => c.length > 0) ?? '';
}

/**
 * Normalize lesson HTML before sanitizing so semantic structure survives the
 * pipeline:
 * 1. Convert BlockNote heading nodes (`data-content-type="heading"`) into real
 *    `h2`-`h6` elements, clamped so we never introduce a second page-level `h1`.
 * 2. Keep existing `ul`/`ol`/`li` list structure intact.
 * 3. Give every `pre` code block a named region (`role="region"` +
 *    `aria-label`) with the language when it can be detected. HTML `lang` is
 *    never derived from programming-language metadata; natural-language
 *    metadata (e.g. `data-natural-language`) is a separate concern.
 */
function normalizeLessonHtml(html: string): string {
  if (typeof DOMParser === 'undefined') return html;
  const doc = new DOMParser().parseFromString(html, 'text/html');

  doc.querySelectorAll('[data-content-type="heading"]').forEach((node) => {
    if (!(node instanceof HTMLElement)) return;
    const rawLevel = Number.parseInt(node.getAttribute('data-level') ?? '', 10);
    const level = Number.isNaN(rawLevel) ? 2 : Math.min(Math.max(rawLevel, 2), 6);
    const heading = doc.createElement(`h${level}`);
    for (const attr of Array.from(node.attributes)) {
      heading.setAttribute(attr.name, attr.value);
    }
    while (node.firstChild) heading.appendChild(node.firstChild);
    node.replaceWith(heading);
  });

  doc.querySelectorAll('pre').forEach((pre) => {
    if (!(pre instanceof HTMLElement)) return;
    const language = readCodeLanguage(pre);
    // Programming-language metadata is not a human-language declaration.
    // Remove author-provided `lang` from code blocks too, while preserving
    // legitimate `lang` attributes on surrounding prose.
    pre.removeAttribute('lang');
    pre.querySelectorAll('code[lang]').forEach((code) => code.removeAttribute('lang'));
    pre.setAttribute('role', 'region');
    pre.setAttribute(
      'aria-label',
      language ? `Code example, ${language}` : 'Code example, language not specified',
    );
  });

  return doc.body.innerHTML;
}

export const ArticleViewer: React.FC<ArticleViewerProps> = ({ html, title }) => {
  const sanitized = useMemo(() => {
    const optimized = optimizeArticleImages(html);
    const normalized = normalizeLessonHtml(optimized);
    return DOMPurify.sanitize(normalized, {
      ALLOWED_ATTR: [
        'class', 'href', 'target', 'rel', 'src', 'alt', 'width', 'height',
        'loading', // keep loading="lazy" after sanitize
        'data-content-type', 'data-level', 'data-text-alignment',
        'data-text-color', 'data-background-color', 'data-checked',
        'role', 'aria-label', 'lang',
      ],
    });
  }, [html]);

  return (
    <article aria-label={title ?? 'Lesson content'}>
      {title && (
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-600 mb-4 pb-2 border-b border-gray-100">
          {title}
        </p>
      )}
      <div
        className="article-viewer__content min-w-0"
        dangerouslySetInnerHTML={{ __html: sanitized }}
      />
    </article>
  );
};

export default ArticleViewer;
