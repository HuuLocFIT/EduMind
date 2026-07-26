import { useLayoutEffect } from 'react';

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

/** Keys (name or property) that SeoMetaTags exclusively owns. */
const SEO_META_KEYS = new Set([
  'description',
  'og:title',
  'og:description',
  'og:image',
  'og:url',
  'og:type',
  'og:site_name',
  'og:locale',
  'twitter:card',
  'twitter:title',
  'twitter:description',
  'twitter:image',
  'robots',
  'prerender-status-code',
]);

function getOrCreateMeta(attr: string, value: string, content: string) {
  const all = document.head.querySelectorAll('meta');
  for (let i = 0; i < all.length; i++) {
    if (all[i].getAttribute(attr) === value) {
      all[i].setAttribute('content', content);
      return;
    }
  }
  const el = document.createElement('meta');
  el.setAttribute(attr, value);
  el.setAttribute('content', content);
  document.head.appendChild(el);
}

function removeSeoElements() {
  const allMetas = document.head.querySelectorAll('meta');
  for (let i = 0; i < allMetas.length; i++) {
    const key = allMetas[i].getAttribute('name') ?? allMetas[i].getAttribute('property');
    if (key && SEO_META_KEYS.has(key)) {
      allMetas[i].remove();
      i--;
    }
  }

  document.head.querySelectorAll('link[rel="canonical"]').forEach(el => el.remove());
  document.head.querySelectorAll('script[type="application/ld+json"]').forEach(el => el.remove());

  // Note: <title> is restored by the effect setting document.title.
}

export const SeoMetaTags = ({
  title, description, canonicalUrl, ogImage = DEFAULT_OG_IMAGE,
  ogType = 'website', twitterCard = 'summary_large_image',
  noIndex = false, jsonLd, prerenderStatusCode,
}: SeoMetaTagsProps) => {
  const fullTitle = `${title} | EduMind`;
  const canonical = canonicalUrl ? `${BASE_URL}${normalizePath(canonicalUrl)}` : undefined;
  const imageUrl = resolveUrl(ogImage);

  useLayoutEffect(() => {
    removeSeoElements();

    document.title = fullTitle;

    getOrCreateMeta('name', 'description', description);

    if (canonical) {
      const link = document.createElement('link');
      link.setAttribute('rel', 'canonical');
      link.setAttribute('href', canonical);
      document.head.appendChild(link);
    }

    getOrCreateMeta('property', 'og:title', fullTitle);
    getOrCreateMeta('property', 'og:description', description);
    getOrCreateMeta('property', 'og:image', imageUrl);
    getOrCreateMeta('property', 'og:url', canonical || BASE_URL);
    getOrCreateMeta('property', 'og:type', ogType);
    getOrCreateMeta('property', 'og:site_name', 'EduMind');
    getOrCreateMeta('property', 'og:locale', 'en_US');

    getOrCreateMeta('name', 'twitter:card', twitterCard);
    getOrCreateMeta('name', 'twitter:title', fullTitle);
    getOrCreateMeta('name', 'twitter:description', description);
    getOrCreateMeta('name', 'twitter:image', imageUrl);

    if (noIndex) {
      getOrCreateMeta('name', 'robots', 'noindex, nofollow');
    }

    if (prerenderStatusCode) {
      getOrCreateMeta('name', 'prerender-status-code', String(prerenderStatusCode));
    }

    if (jsonLd) {
      const script = document.createElement('script');
      script.setAttribute('type', 'application/ld+json');
      script.textContent = JSON.stringify(jsonLd).replace(/</g, '\\u003c');
      document.head.appendChild(script);
    }

    return () => {
      removeSeoElements();
    };
  }, [fullTitle, description, canonical, imageUrl, ogType, twitterCard, noIndex, jsonLd, prerenderStatusCode]);

  return null;
};
