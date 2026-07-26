import type { Plugin, ResolvedConfig } from 'vite';
import { writeFileSync, mkdirSync } from 'fs';
import { resolve } from 'path';

interface SitemapUrlEntry {
  loc: string;
  changefreq?: string;
  priority?: string;
  lastmod?: string;
}

interface ViteSitemapPluginOptions {
  baseUrl: string;
  staticRoutes?: string[];
}

async function fetchCourseSlugs(apiBaseUrl: string): Promise<string[]> {
  try {
    const response = await fetch(`${apiBaseUrl}/api/courses/filter?size=1000`);
    if (!response.ok) {
      console.warn(`[vite-sitemap] Failed to fetch courses: ${response.status}`);
      return [];
    }
    const json = await response.json();
    const courses = json?.data || json?.content || json || [];
    return (Array.isArray(courses) ? courses : [])
      .filter((c: Record<string, unknown>) => c?.slug)
      .map((c: Record<string, unknown>) => `/courses/${c.slug}`);
  } catch (err) {
    console.warn('[vite-sitemap] Could not fetch course slugs:', err);
    return [];
  }
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function generateSitemapXml(entries: SitemapUrlEntry[]): string {
  const urls = entries
    .map(
      (e) => `  <url>
    <loc>${escapeXml(e.loc)}</loc>
    ${e.changefreq ? `<changefreq>${e.changefreq}</changefreq>` : ''}
    ${e.priority ? `<priority>${e.priority}</priority>` : ''}
    ${e.lastmod ? `<lastmod>${e.lastmod}</lastmod>` : ''}
  </url>`,
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;
}

export function viteSitemapPlugin(
  options: ViteSitemapPluginOptions,
): Plugin {
  let config: ResolvedConfig;
  let apiBaseUrl: string;

  return {
    name: 'vite-sitemap',
    enforce: 'post',

    configResolved(resolvedConfig) {
      config = resolvedConfig;
      apiBaseUrl = resolvedConfig.env?.VITE_API_URL as string
        || process.env.VITE_API_URL
        || 'http://localhost:8080';
    },

    async closeBundle() {
      const { baseUrl, staticRoutes = [] } = options;

      const staticEntries: SitemapUrlEntry[] = staticRoutes.map((route) => ({
        loc: `${baseUrl}${route}`,
        changefreq: 'weekly',
        priority: route === '/' ? '1.0' : '0.8',
      }));

      const coursePaths = await fetchCourseSlugs(apiBaseUrl);
      if (coursePaths.length === 0) {
        console.warn('[vite-sitemap] No course slugs fetched — sitemap will only contain static routes');
      }

      const dynamicEntries: SitemapUrlEntry[] = coursePaths.map((path) => ({
        loc: `${baseUrl}${path}`,
        changefreq: 'weekly',
        priority: '0.7',
      }));

      const allEntries = [...staticEntries, ...dynamicEntries];
      const sitemap = generateSitemapXml(allEntries);

      const outDir = resolve(config.root, config.build.outDir);
      mkdirSync(outDir, { recursive: true });
      writeFileSync(resolve(outDir, 'sitemap.xml'), sitemap, 'utf-8');

      console.log(`[vite-sitemap] Generated sitemap.xml with ${allEntries.length} URLs at ${outDir}/sitemap.xml`);
      if (dynamicEntries.length > 0) {
        console.log(`[vite-sitemap]   - ${dynamicEntries.length} course pages`);
      }
    },
  };
}
