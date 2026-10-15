/*
 * Boot script for the user app. Lives in a file (not inline in index.html) so
 * the Content-Security-Policy can keep script-src free of 'unsafe-inline'.
 */
(function () {
  // Apply the preloaded Google Fonts stylesheet without blocking render.
  // Replaces the old inline onload="this.rel='stylesheet'" handler.
  // A script-inserted stylesheet is not render-blocking, and the file is
  // already in the preload cache. It is inserted right after the preload
  // link so prerendered snapshots keep it above this script, where the guard
  // can see it and skip adding a duplicate.
  const preload = document.getElementById('font-css');
  if (preload && !document.querySelector('link[rel="stylesheet"][href="' + preload.href + '"]')) {
    const stylesheet = document.createElement('link');
    stylesheet.rel = 'stylesheet';
    stylesheet.href = preload.href;
    preload.parentNode.insertBefore(stylesheet, preload.nextSibling);
  }

  // Strip prerendered SEO tags before React 19 hydrates.
  // React 19 cannot reliably adopt prerendered SEO tags, causing duplicates
  // in both initial render and client-side navigation.
  // Crawlers (no JS) still receive the prerendered HTML with full SEO tags.
  document.addEventListener('DOMContentLoaded', function () {
    const selectors = [
      'title',
      'meta[name="description"]',
      'meta[name="robots"]',
      'meta[name="prerender-status-code"]',
      'meta[name^="twitter:"]',
      'meta[property^="og:"]',
      'link[rel="canonical"]',
      'script[type="application/ld+json"]'
    ];
    selectors.forEach(function (selector) {
      document.head.querySelectorAll(selector).forEach(function (el) {
        el.remove();
      });
    });
  }, { once: true });
})();
