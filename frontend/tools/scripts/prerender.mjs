import { createServer } from 'http';
import { request as httpRequest } from 'http';
import { request as httpsRequest } from 'https';
import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync } from 'fs';
import { resolve, dirname, extname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST_DIR = resolve(__dirname, '../../dist/apps/user');
const PORT = 4173;
const API_URL = process.env.VITE_API_URL || 'https://api.edumind.nguyenloc.dev';

const MIME_TYPES = {
  '.html': 'text/html',
  '.mjs': 'text/javascript',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

function proxyApiRequest(req, res) {
  const url = new URL(req.url, API_URL);
  const isHttps = url.protocol === 'https:';
  const requester = isHttps ? httpsRequest : httpRequest;

  const headers = { ...req.headers, host: url.hostname };

  const proxyReq = requester(url.toString(), { method: req.method, headers, rejectUnauthorized: false }, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res, { end: true });
  });

  proxyReq.on('error', (err) => {
    console.warn(`[prerender] API proxy failed for ${req.url}: ${err.message}`);
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'API unavailable during prerender' }));
  });

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    req.pipe(proxyReq, { end: true });
  } else {
    proxyReq.end();
  }
}

const VANILLA_INDEX_CONTENT = (() => {
  const path = join(DIST_DIR, 'index.html');
  if (!existsSync(path)) {
    console.error('[prerender] FATAL: dist/apps/user/index.html not found. Run Vite build first.');
    process.exit(1);
  }
  return readFileSync(path, 'utf-8');
})();

/**
 * Deduplicate SEO tags in prerendered HTML.
 *
 * Keeps the LAST occurrence of each SEO tag group and removes earlier duplicates.
 */
function deduplicateSeoTags(html) {
  // Deduplicate <title> — keep last
  const titleMatches = [...html.matchAll(/<title[^>]*>[\s\S]*?<\/title>/gi)];
  if (titleMatches.length > 1) {
    for (let i = 0; i < titleMatches.length - 1; i++) {
      html = html.replace(titleMatches[i][0], '');
    }
  }

  // Deduplicate <meta> by name or property attribute — keep last of each key
  const metaRegex = /<meta\s+(?:[^>]*?\s)?(?:name|property)\s*=\s*["']([^"']+)["'][^>]*?\/?>/gi;
  const metaByKey = new Map();
  let match;
  while ((match = metaRegex.exec(html)) !== null) {
    const key = match[1].toLowerCase();
    // Skip non-SEO meta tags
    if (['viewport', 'charset', 'theme-color', 'color-scheme', 'format-detection'].includes(key)) continue;
    if (key.startsWith('apple-mobile') || key.startsWith('msapplication')) continue;
    if (!metaByKey.has(key)) metaByKey.set(key, []);
    metaByKey.get(key).push(match[0]);
  }
  for (const [, occurrences] of metaByKey) {
    if (occurrences.length > 1) {
      for (let i = 0; i < occurrences.length - 1; i++) {
        html = html.replace(occurrences[i], '');
      }
    }
  }

  // Deduplicate <link rel="canonical"> — keep last
  const canonicalRegex = /<link\s+[^>]*rel\s*=\s*["']canonical["'][^>]*\/?>/gi;
  const canonicalMatches = [...html.matchAll(canonicalRegex)];
  if (canonicalMatches.length > 1) {
    for (let i = 0; i < canonicalMatches.length - 1; i++) {
      html = html.replace(canonicalMatches[i][0], '');
    }
  }

  // Deduplicate <script type="application/ld+json"> — keep last
  const jsonLdRegex = /<script\s+type\s*=\s*["']application\/ld\+json["']\s*>[\s\S]*?<\/script>/gi;
  const jsonLdMatches = [...html.matchAll(jsonLdRegex)];
  if (jsonLdMatches.length > 1) {
    for (let i = 0; i < jsonLdMatches.length - 1; i++) {
      html = html.replace(jsonLdMatches[i][0], '');
    }
  }

  // Clean up empty lines left by removed tags inside <head>
  const headStart = html.indexOf('<head');
  const headEnd = html.indexOf('</head>');
  if (headStart !== -1 && headEnd !== -1) {
    const headContent = html.slice(headStart, headEnd);
    const cleanedHead = headContent.replace(/^\s*\n/gm, '');
    html = html.slice(0, headStart) + cleanedHead + html.slice(headEnd);
  }

  return html;
}

function assertNoDuplicateSeoTags(html, route) {
  const titleCount = (html.match(/<title[^>]*>[\s\S]*?<\/title>/gi) || []).length;
  const descCount = (html.match(/<meta\s+(?:[^>]*?\s)?name\s*=\s*["']description["'][^>]*?\/?>/gi) || []).length;
  const canonicalCount = (html.match(/<link\s+[^>]*rel\s*=\s*["']canonical["'][^>]*\/?>/gi) || []).length;
  const ogTitleCount = (html.match(/<meta\s+(?:[^>]*?\s)?property\s*=\s*["']og:title["'][^>]*?\/?>/gi) || []).length;
  const twitterTitleCount = (html.match(/<meta\s+(?:[^>]*?\s)?name\s*=\s*["']twitter:title["'][^>]*\/?>/gi) || []).length;

  if (titleCount > 1 || descCount > 1 || canonicalCount > 1 || ogTitleCount > 1 || twitterTitleCount > 1) {
    console.warn(
      `[prerender] SEO duplicates still detected for ${route}: ` +
      `title=${titleCount}, description=${descCount}, canonical=${canonicalCount}, ` +
      `og:title=${ogTitleCount}, twitter:title=${twitterTitleCount}`
    );
  }
}

function serveStaticOrProxy(req, res) {
  if (req.url.startsWith('/api/')) {
    return proxyApiRequest(req, res);
  }

  const filePath = join(DIST_DIR, req.url === '/' ? 'index.html' : req.url);
  const ext = extname(filePath);

  // During prerender, always serve the vanilla index.html for HTML routes
  // to avoid React 19 hoisting duplicates on top of already-prerendered files.
  const isHtmlRoute = !ext || ext === '.html';
  if (isHtmlRoute) {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(VANILLA_INDEX_CONTENT);
    return;
  }

  if (!existsSync(filePath) || !statSync(filePath).isFile()) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
    return;
  }

  const contentType = MIME_TYPES[ext] || 'application/octet-stream';
  const content = readFileSync(filePath);
  res.writeHead(200, { 'Content-Type': contentType });
  res.end(content);
}

async function fetchCourseSlugs() {
  try {
    const response = await fetch(`${API_URL}/api/courses/filter?size=1000`);
    if (!response.ok) {
      console.warn(`[prerender] Failed to fetch courses: ${response.status}`);
      return [];
    }
    const json = await response.json();
    const courses = json?.data || json?.content || json || [];
    return (Array.isArray(courses) ? courses : [])
      .filter((c) => c?.slug)
      .map((c) => `/courses/${c.slug}`);
  } catch (err) {
    console.warn('[prerender] Could not fetch course slugs:', err);
    return [];
  }
}

const STATIC_ROUTES = ['/', '/courses'];

async function prerender() {
  const server = createServer(serveStaticOrProxy);
  await new Promise((resolve) => server.listen(PORT, resolve));
  console.log(`[prerender] Static server on http://localhost:${PORT}, API proxy to ${API_URL}`);

  const courseRoutes = await fetchCourseSlugs();
  const allRoutes = [...STATIC_ROUTES, ...courseRoutes];
  console.log(`[prerender] ${STATIC_ROUTES.length} static + ${courseRoutes.length} course routes to render`);

  let browser;
  try {
    try {
      const { launch: launchChromium } = await import('puppeteer-core');
      const chromium = await import('@sparticuz/chromium');
      const executablePath = await chromium.executablePath();
      browser = await launchChromium({
        executablePath,
        headless: true,
        args: [...chromium.args, '--no-sandbox', '--disable-setuid-sandbox'],
      });
    } catch {
      const { launch: launchFallback } = await import('puppeteer');
      browser = await launchFallback({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
    }
  } catch (launchErr) {
    console.warn('[prerender] Chrome binary not found in build environment. Skipping static prerendering.');
    console.warn(`[prerender] Details: ${launchErr.message}`);
    await new Promise(resolve => server.close(resolve));
    console.log('[prerender] Fallback to standard SPA index.html build.');
    return;
  }

  try {
    for (const route of allRoutes) {
      const url = `http://localhost:${PORT}${route}`;
      console.log(`[prerender] Rendering ${url}...`);

      const page = await browser.newPage();

      // Override fetch/XHR in page context to route API calls through local proxy (avoid CORS)
      const apiOrigin = new URL(API_URL).origin;
      const localOrigin = `http://localhost:${PORT}`;
      await page.evaluateOnNewDocument((remote, local) => {
        const origFetch = window.fetch.bind(window);
        window.fetch = (input, init) => {
          const url = typeof input === 'string' ? input : input instanceof Request ? input.url : '';
          return url.startsWith(remote)
            ? origFetch(url.replace(remote, local), init)
            : origFetch(input, init);
        };
        const origXhrOpen = XMLHttpRequest.prototype.open;
        XMLHttpRequest.prototype.open = function(...args) {
          const [, url] = args;
          args[1] = typeof url === 'string' && url.startsWith(remote)
            ? url.replace(remote, local)
            : url;
          return origXhrOpen.apply(this, args);
        };
      }, apiOrigin, localOrigin);

      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

      const rawHtml = await page.content();
      const html = deduplicateSeoTags(rawHtml);
      assertNoDuplicateSeoTags(html, route);
      const relPath = route === '/' ? 'index.html' : `${route.slice(1)}/index.html`;
      const fullPath = resolve(DIST_DIR, relPath);
      const dir = dirname(fullPath);

      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
      writeFileSync(fullPath, html, 'utf-8');
      console.log(`[prerender] Saved ${relPath} (${(html.length / 1024).toFixed(1)} KB)`);

      await page.close();
    }

    console.log(`\n[prerender] Done! ${allRoutes.length} routes prerendered.`);
  } finally {
    await browser.close();
    server.close();
  }
}

prerender().catch((err) => {
  console.error('[prerender] Failed:', err);
  process.exit(1);
});
