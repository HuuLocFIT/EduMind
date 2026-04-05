const UPLOAD_SEG = '/upload/';

/**
 * Injects Cloudinary transforms into a Cloudinary URL.
 * Returns url unchanged if not Cloudinary. Returns '' if src is falsy.
 *
 * cldUrl("https://res.cloudinary.com/demo/image/upload/v1/avatar.jpg", "f_auto,q_auto,w_128,c_limit")
 * → "https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,w_128,c_limit/v1/avatar.jpg"
 */
export function cldUrl(url: string | null | undefined, transforms: string): string {
  if (!url) return '';
  const idx = url.indexOf(UPLOAD_SEG);
  if (idx === -1) return url; // Non-Cloudinary URL: return as-is
  return url.slice(0, idx + UPLOAD_SEG.length) + transforms + '/' + url.slice(idx + UPLOAD_SEG.length);
}

/**
 * Inject f_auto,q_auto,w_800,c_limit + loading="lazy" into all Cloudinary <img> tags
 * in an ArticleViewer HTML string. Use with useMemo.
 */
export function optimizeArticleImages(html: string): string {
  return html.replace(
    /<img([^>]*?)\ssrc="(https:\/\/res\.cloudinary\.com\/[^"]+)"([^>]*?)>/gi,
    (_, before, src, after) => {
      const optimized = cldUrl(src, 'f_auto,q_auto,w_800,c_limit');
      const hasLoading = /loading=/i.test(before + after);
      const lazyAttr = hasLoading ? '' : ' loading="lazy"';
      return `<img${before} src="${optimized}"${after}${lazyAttr}>`;
    },
  );
}
