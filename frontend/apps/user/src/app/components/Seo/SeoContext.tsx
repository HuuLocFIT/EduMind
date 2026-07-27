import { createContext, useContext, useMemo, useState, useCallback, ReactNode } from 'react';

interface SeoConfig {
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

interface SeoContextValue {
  config: SeoConfig | null;
  setSeo: (config: SeoConfig) => void;
  clearSeo: () => void;
}

const SeoContext = createContext<SeoContextValue | null>(null);

export function SeoProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<SeoConfig | null>(null);

  const setSeo = useCallback((next: SeoConfig) => {
    setConfig((prev) => {
      if (prev && JSON.stringify(prev) === JSON.stringify(next)) {
        return prev;
      }
      return next;
    });
  }, []);

  const clearSeo = useCallback(() => {
    setConfig(null);
  }, []);

  const value = useMemo(
    () => ({ config, setSeo, clearSeo }),
    [config, setSeo, clearSeo]
  );

  return <SeoContext.Provider value={value}>{children}</SeoContext.Provider>;
}

export function useSeo() {
  return useContext(SeoContext);
}
