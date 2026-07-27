import { useEffect } from 'react';
import { useSeo } from './SeoContext';

interface UseSeoMetaTagsProps {
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

export function useSeoMetaTags({
  title,
  description,
  canonicalUrl,
  ogImage,
  ogType,
  twitterCard,
  noIndex,
  jsonLd,
  prerenderStatusCode,
}: UseSeoMetaTagsProps) {
  const { setSeo, clearSeo } = useSeo();

  const jsonLdStr = JSON.stringify(jsonLd);

  useEffect(() => {
    setSeo({
      title,
      description,
      canonicalUrl,
      ogImage,
      ogType,
      twitterCard,
      noIndex,
      jsonLd,
      prerenderStatusCode,
    });

    return () => {
      clearSeo();
    };
  }, [
    title,
    description,
    canonicalUrl,
    ogImage,
    ogType,
    twitterCard,
    noIndex,
    jsonLdStr,
    prerenderStatusCode,
    setSeo,
    clearSeo,
  ]);
}
