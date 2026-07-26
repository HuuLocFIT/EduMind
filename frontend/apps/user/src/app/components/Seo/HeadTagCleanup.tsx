import { useLayoutEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Head tag deduplication for React 19 Native Metadata + SPA Prerender.
 *
 * CRITICAL: React 19 manages its OWN component DOM nodes in its Fiber tree.
 * Manually removing React 19 DOM nodes causes React 19 to crash on unmount with:
 * "Uncaught TypeError: Cannot read properties of null (reading 'removeChild')"
 *
 * Therefore, we MUST ONLY remove static prerendered HTML nodes (which do NOT have
 * React internal properties like __reactFiber$ or __reactProps$).
 */
export function HeadTagCleanup() {
  const location = useLocation();

  useLayoutEffect(() => {
    const isReactNode = (el: Element) =>
      Object.keys(el).some((k) => k.startsWith('__react'));

    const keepAttrs = new Set(['charset']);
    const keepNames = new Set(['viewport']);

    const toRemove: Element[] = [];

    // 1. Title: remove static title if React 19 title exists
    const titles = document.head.querySelectorAll('title');
    const hasReactTitle = Array.from(titles).some(isReactNode);
    if (hasReactTitle) {
      titles.forEach((t) => {
        if (!isReactNode(t)) toRemove.push(t);
      });
    }

    // 2. Meta: remove static meta tags if React 19 meta tags exist for the same key
    //    Never remove critical meta tags (charset, viewport)
    const metas = document.head.querySelectorAll('meta');
    const reactMetaKeys = new Set<string>();

    metas.forEach((m) => {
      if (isReactNode(m)) {
        const key = m.getAttribute('name') ?? m.getAttribute('property');
        if (key) reactMetaKeys.add(key);
      }
    });

    metas.forEach((m) => {
      if (!isReactNode(m)) {
        if (keepAttrs.has(m.getAttribute('charset') ?? '') || keepNames.has(m.getAttribute('name') ?? '')) return;
        const key = m.getAttribute('name') ?? m.getAttribute('property');
        if (key && reactMetaKeys.has(key)) {
          toRemove.push(m);
        }
      }
    });

    // 3. Canonical: remove static canonical if React 19 canonical exists
    const canonicals = document.head.querySelectorAll('link[rel="canonical"]');
    const hasReactCanonical = Array.from(canonicals).some(isReactNode);
    if (hasReactCanonical) {
      canonicals.forEach((c) => {
        if (!isReactNode(c)) toRemove.push(c);
      });
    }

    // 4. JSON-LD Scripts: remove static JSON-LD scripts if React JSON-LD exists
    const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
    const hasReactJsonLd = Array.from(jsonLdScripts).some(isReactNode);
    if (hasReactJsonLd) {
      jsonLdScripts.forEach((s) => {
        if (!isReactNode(s)) toRemove.push(s);
      });
    }

    toRemove.forEach((el) => {
      if (el.parentNode) {
        el.parentNode.removeChild(el);
      }
    });
  }, [location.key]);

  return null;
}
