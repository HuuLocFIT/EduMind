import React, { useMemo } from 'react';
import DOMPurify from 'dompurify';
import { optimizeArticleImages } from '@edumind/shared-utils';

interface ArticleViewerProps {
  html: string;
  title?: string;
}

export const ArticleViewer: React.FC<ArticleViewerProps> = ({ html, title }) => {
  const sanitized = useMemo(() => {
    const optimized = optimizeArticleImages(html);
    return DOMPurify.sanitize(optimized, {
      ALLOWED_ATTR: [
        'class', 'href', 'target', 'rel', 'src', 'alt', 'width', 'height',
        'loading', // keep loading="lazy" after sanitize
        'data-content-type', 'data-level', 'data-text-alignment',
        'data-text-color', 'data-background-color', 'data-checked',
      ],
    });
  }, [html]);

  return (
    <article>
      {title && (
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-4 pb-2 border-b border-gray-100">
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
