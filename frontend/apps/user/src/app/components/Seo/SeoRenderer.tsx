import { useSeo } from './SeoContext';
import { SeoMetaTags } from './SeoMetaTags';

export function SeoRenderer() {
  const { config } = useSeo();

  if (!config) return null;

  return <SeoMetaTags {...config} />;
}
