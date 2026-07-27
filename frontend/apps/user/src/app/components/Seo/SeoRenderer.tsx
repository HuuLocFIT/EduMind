import { useSeo } from './SeoContext';
import { SeoMetaTags } from './SeoMetaTags';

export function SeoRenderer() {
  const seo = useSeo();

  if (!seo?.config) return null;

  return <SeoMetaTags {...seo.config} />;
}
