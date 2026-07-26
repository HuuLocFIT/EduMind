import { useLayoutEffect, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Head tag deduplication for React 19 Native Metadata + SPA Prerender.
 *
 * React 19 hoists <title>/<meta>/<link> to <head> declaratively. Since
 * `main.tsx` uses `createRoot` (not `hydrateRoot`), React 19's hoistable
 * registry starts empty and has no awareness of prerendered static tags in
 * <head>. React creates NEW managed nodes alongside the static ones, causing
 * duplicates.
 *
 * Strategy: group elements by their identifying key and keep only the LAST
 * element of each group. React 19 always appends hoistables to the end of
 * <head> (via Head.insertBefore or appendChild), so "last" = React-managed =
 * most up-to-date. This is a pragmatic assumption about React's current
 * behavior — if React's insertion order changes in a future release, the
 * strategy can be updated in this single file.
 *
 * The MutationObserver provides continuous protection for in-page state
 * transitions (loading→success→error) where useLayoutEffect's [location.key]
 * dependency doesn't re-fire.
 *
 * Safety: removeChild is wrapped in try-catch because some React 19 builds
 * call parentNode.removeChild() during hoistable disposal — if an element was
 * already removed, accessing .parentNode on a detached node throws.
 *
 * @see SeoMetaTags — the component that injects SEO tags into the tree
 * @see prerender.mjs — prevents HomePage tags from leaking into course page prerenders
 */

// ── Key extraction ────────────────────────────────────────────────────────

function titleKey(_el: Element): string {
  return 'title';
}

function metaKey(el: Element): string {
  return el.getAttribute('name')
    ?? el.getAttribute('property')
    ?? el.getAttribute('http-equiv')
    ?? '';
}

function canonicalKey(_el: Element): string {
  return 'canonical';
}

function jsonLdKey(el: Element): string {
  try {
    const parsed = JSON.parse(el.textContent ?? '{}');
    return `ld:${parsed['@type'] ?? 'WebPage'}`;
  } catch {
    const text = el.textContent ?? '';
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = ((hash << 5) - hash) + text.charCodeAt(i);
      hash |= 0;
    }
    return `ld:unparseable:${hash}`;
  }
}

// ── Skip guards ───────────────────────────────────────────────────────────

const PROTECTED_META_NAMES = new Set([
  'viewport',
  'theme-color',
  'color-scheme',
  'format-detection',
]);

function shouldSkipMeta(el: HTMLMetaElement): boolean {
  if (el.getAttribute('charset')) return true;
  const name = el.getAttribute('name');
  if (name && PROTECTED_META_NAMES.has(name)) return true;
  if (name?.startsWith('apple-mobile-web-app')) return true;
  if (name?.startsWith('msapplication')) return true;
  if (el.getAttribute('http-equiv')) return true;
  return false;
}

// ── Core deduplication ────────────────────────────────────────────────────

function deduplicateHeadElements<T extends Element>(
  selector: string,
  keyFn: (el: T) => string,
  skip: (el: T) => boolean = () => false,
) {
  const grouped = new Map<string, T[]>();
  const elements = Array.from(document.head.querySelectorAll<T>(selector));
  for (const el of elements) {
    if (skip(el)) continue;
    const key = keyFn(el);
    if (!key) continue;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(el);
  }

  grouped.forEach((els) => {
    if (els.length <= 1) return;
    for (let i = 0; i < els.length - 1; i++) {
      const el = els[i];
      if (el.isConnected && el.parentNode) {
        try {
          el.parentNode.removeChild(el);
        } catch {
          // React 19 may have already removed this hoistable node during
          // its own disposal cycle. The element is already gone — safe to ignore.
        }
      }
    }
  });
}

function deduplicateAllHeadElements() {
  deduplicateHeadElements<HTMLTitleElement>('title', titleKey);

  deduplicateHeadElements<HTMLMetaElement>('meta', metaKey, shouldSkipMeta);

  deduplicateHeadElements<HTMLLinkElement>(
    'link[rel="canonical"]',
    canonicalKey,
  );

  deduplicateHeadElements<HTMLScriptElement>(
    'script[type="application/ld+json"]',
    jsonLdKey,
  );
}

// ── React integration ─────────────────────────────────────────────────────

const WATCHED_TAGS = new Set(['TITLE', 'META', 'LINK', 'SCRIPT']);

export function HeadTagCleanup() {
  const location = useLocation();

  useLayoutEffect(() => {
    deduplicateAllHeadElements();
  }, [location.key]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;

    const scheduleDedup = () => {
      if (timer) return;
      timer = setTimeout(() => {
        timer = null;
        deduplicateAllHeadElements();
      }, 0);
    };

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        Array.from(mutation.addedNodes).forEach((node) => {
          if (node instanceof Element && WATCHED_TAGS.has(node.tagName)) {
            scheduleDedup();
          }
        });
      }
    });

    observer.observe(document.head, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      if (timer) clearTimeout(timer);
    };
  }, []);

  return null;
}
