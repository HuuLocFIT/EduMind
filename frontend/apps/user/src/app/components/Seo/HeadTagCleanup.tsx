import { useLayoutEffect, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * DEV-only duplicate detection for <title>/<meta>/<link> tags in <head>.
 *
 * Architecture overview:
 *  1. SeoMetaTags.tsx renders SEO tags as JSX — React 19 hoists them into
 *     <head> declaratively and manages their full lifecycle (create, update,
 *     unmount). React 19 automatically adopts matching prerendered tags.
 *  2. prerender.mjs deduplicates SEO tags in the Puppeteer output HTML so
 *     crawlers never see duplicates in the static files.
 *  3. This component (HeadTagCleanup) monitors <head> for duplicates and
 *     warns in DEV mode — it NEVER mutates the DOM.
 *
 * Why no DOM removal?
 *  React 19's hoistable system tracks managed nodes via an internal Map — it
 *  does NOT attach __reactFiber$ or any detectable property to hoisted elements.
 *  Removing a React-managed hoisted node causes React to crash with
 *  "Cannot read properties of null (reading 'removeChild')".
 *
 * @see SeoMetaTags.tsx  — JSX declarative SEO tags (React 19 hoistable)
 * @see prerender.mjs    — deduplicates SEO tags in prerendered HTML output
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

// ── Duplicate detection (read-only, no DOM mutations) ──────────────────────

function findDuplicateGroups<T extends Element>(
  selector: string,
  keyFn: (el: T) => string,
  skip: (el: T) => boolean = () => false,
): Map<string, T[]> {
  const grouped = new Map<string, T[]>();
  const elements = Array.from(document.head.querySelectorAll<T>(selector));
  for (const el of elements) {
    if (skip(el)) continue;
    const key = keyFn(el);
    if (!key) continue;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(el);
  }
  // Only return groups with > 1 element
  for (const [key, els] of grouped) {
    if (els.length <= 1) grouped.delete(key);
  }
  return grouped;
}

function detectDuplicates() {
  const duplicates: string[] = [];

  const titleDupes = findDuplicateGroups<HTMLTitleElement>('title', titleKey);
  if (titleDupes.size) {
    duplicates.push(`title (x${titleDupes.values().next().value!.length})`);
  }

  const metaDupes = findDuplicateGroups<HTMLMetaElement>('meta', metaKey, shouldSkipMeta);
  for (const [key, els] of metaDupes) {
    duplicates.push(`meta[${key}] (x${els.length})`);
  }

  const canonicalDupes = findDuplicateGroups<HTMLLinkElement>(
    'link[rel="canonical"]',
    canonicalKey,
  );
  if (canonicalDupes.size) {
    duplicates.push(`link[canonical] (x${canonicalDupes.values().next().value!.length})`);
  }

  const jsonLdDupes = findDuplicateGroups<HTMLScriptElement>(
    'script[type="application/ld+json"]',
    jsonLdKey,
  );
  for (const [key, els] of jsonLdDupes) {
    duplicates.push(`script[ld+json ${key}] (x${els.length})`);
  }

  return duplicates;
}

// ── React integration ─────────────────────────────────────────────────────

const WATCHED_TAGS = new Set(['TITLE', 'META', 'LINK', 'SCRIPT']);

export function HeadTagCleanup() {
  const location = useLocation();

  useLayoutEffect(() => {
    const dupes = detectDuplicates();
    if (dupes.length > 0 && import.meta.env.DEV) {
      console.warn(
        '[HeadTagCleanup] Duplicate head tags detected:',
        dupes,
        '\n  These should be fixed by the prerender strip in prerender.mjs.',
        '\n  React 19 hoisted nodes cannot safely be removed from the DOM.',
      );
    }
  }, [location.key]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;

    const checkDupes = () => {
      if (timer) return;
      timer = setTimeout(() => {
        timer = null;
        const dupes = detectDuplicates();
        if (dupes.length > 0 && import.meta.env.DEV) {
          console.warn(
            '[HeadTagCleanup] Duplicate head tags detected (observer):',
            dupes,
          );
        }
      }, 0);
    };

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        Array.from(mutation.addedNodes).forEach((node) => {
          if (node instanceof Element && WATCHED_TAGS.has(node.tagName)) {
            checkDupes();
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
