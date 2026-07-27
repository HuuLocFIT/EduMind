interface SeoMetaTagsProps {
  title: string;
  description: string;
  canonicalUrl?: string;
  ogImage?: string;
  ogType?: 'website' | 'article' | 'product';
  twitterCard?: 'summary' | 'summary_large_image';
  noIndex?: boolean;
  jsonLd?: Record<string, unknown>;
  prerenderStatusCode?: number;
}

const BASE_URL = import.meta.env['VITE_APP_URL'] ?? 'https://edumind.nguyenloc.dev';
const DEFAULT_OG_IMAGE = '/og-edumind.png';

const resolveUrl = (path: string) =>
  path.startsWith('http') ? path : `${BASE_URL}${path}`;

const normalizePath = (path: string) =>
  path.startsWith('/') ? path : `/${path}`;

/**
 * Declarative SEO meta tags using React 19's native hoistable support.
 *
 * React 19 automatically hoists <title>, <meta>, <link>, and <script> tags
 * rendered inside the component tree into <head>. It also:
 *  - Adopts existing matching tags from prerendered HTML (no duplicates)
 *  - Cleans up tags when the component unmounts (no manual .remove() needed)
 *  - Deduplicates tags based on key attributes (name, property, rel)
 *
 * IMPORTANT: Do NOT use imperative DOM manipulation (document.createElement,
 * .remove(), etc.) for <head> tags — React 19 tracks hoisted nodes internally
 * and will crash with "Cannot read properties of null (reading 'removeChild')"
 * if external code removes nodes it manages.
 *
 * @see HeadTagCleanup.tsx — dev-only duplicate detection (read-only, no mutations)
 * @see prerender.mjs — deduplicates SEO tags in prerendered HTML output
 */
export const SeoMetaTags = ({
  title, description, canonicalUrl, ogImage = DEFAULT_OG_IMAGE,
  ogType = 'website', twitterCard = 'summary_large_image',
  noIndex = false, jsonLd, prerenderStatusCode,
}: SeoMetaTagsProps) => {
  const fullTitle = `${title} | EduMind`;
  const canonical = canonicalUrl ? `${BASE_URL}${normalizePath(canonicalUrl)}` : undefined;
  const imageUrl = resolveUrl(ogImage);

  return (
    <>
      <title data-seo="react">{fullTitle}</title>
      <meta name="description" content={description} data-seo="react" />
      {canonical && <link rel="canonical" href={canonical} data-seo="react" />}

      {/* Open Graph */}
      <meta property="og:title" content={fullTitle} data-seo="react" />
      <meta property="og:description" content={description} data-seo="react" />
      <meta property="og:image" content={imageUrl} data-seo="react" />
      <meta property="og:url" content={canonical || BASE_URL} data-seo="react" />
      <meta property="og:type" content={ogType} data-seo="react" />
      <meta property="og:site_name" content="EduMind" data-seo="react" />
      <meta property="og:locale" content="en_US" data-seo="react" />

      {/* Twitter Card */}
      <meta name="twitter:card" content={twitterCard} data-seo="react" />
      <meta name="twitter:title" content={fullTitle} data-seo="react" />
      <meta name="twitter:description" content={description} data-seo="react" />
      <meta name="twitter:image" content={imageUrl} data-seo="react" />

      {/* Conditional tags */}
      {noIndex && <meta name="robots" content="noindex, nofollow" data-seo="react" />}
      {prerenderStatusCode && (
        <meta name="prerender-status-code" content={String(prerenderStatusCode)} data-seo="react" />
      )}

      {/* Structured Data (JSON-LD) */}
      {jsonLd && (
        <script
          type="application/ld+json"
          data-seo="react"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c'),
          }}
        />
      )}
    </>
  );
};
