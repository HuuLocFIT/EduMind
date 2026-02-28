import React from "react";
import DOMPurify from "dompurify";

interface ArticleViewerProps {
  html: string;
  title?: string;
}

export const ArticleViewer: React.FC<ArticleViewerProps> = ({ html, title }) => {
  const sanitized = DOMPurify.sanitize(html, {
    ALLOWED_ATTR: [
      "class", "href", "target", "rel", "src", "alt", "width", "height",
      "data-content-type", "data-level", "data-text-alignment",
      "data-text-color", "data-background-color", "data-checked",
    ],
  });

  return (
    <article>
      {title && (
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-4 pb-2 border-b border-gray-100">
          {title}
        </p>
      )}
      <div
        className="article-viewer__content"
        dangerouslySetInnerHTML={{ __html: sanitized }}
      />
    </article>
  );
};

export default ArticleViewer;
