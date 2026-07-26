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
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      {canonical && <link rel="canonical" href={canonical} />}

      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={imageUrl} />
      <meta property="og:url" content={canonical || BASE_URL} />
      <meta property="og:type" content={ogType} />
      <meta property="og:site_name" content="EduMind" />
      <meta property="og:locale" content="en_US" />

      <meta name="twitter:card" content={twitterCard} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={imageUrl} />

      {noIndex && <meta name="robots" content="noindex, nofollow" />}

      {prerenderStatusCode && <meta name="prerender-status-code" content={String(prerenderStatusCode)} />}

      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c'),
          }}
        />
      )}
    </>
  );
};
