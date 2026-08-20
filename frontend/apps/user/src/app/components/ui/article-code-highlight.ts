import { codeBlockOptions } from '@blocknote/code-block';

/**
 * Save-time syntax highlighting for article code blocks.
 *
 * Lesson articles are highlighted once, when the teacher saves, so the student
 * bundle never has to ship a syntax highlighter and code is coloured on the
 * first paint. Shiki natively emits inline `style="color:#hex"`, which would
 * force `ArticleViewer` to allow `style` through DOMPurify — a wide opening for
 * CSS injection. Instead every token colour is rewritten to a `shk-<hex>` class
 * whose rules live in `styles.css`, so the sanitizer allowlist is unchanged.
 *
 * The theme is `github-dark-default`: its comment colour (#8b949e) clears WCAG
 * AA at 6.15:1 against the block background (#0d1117), where the `github-dark`
 * bundled with the editor only reaches 3.05:1.
 */
const THEME = 'github-dark-default';

/** Marks a `<pre>` whose contents are highlighter output rather than plain source. */
const HIGHLIGHTED_ATTR = 'data-highlighted';

type Highlighter = Awaited<ReturnType<typeof codeBlockOptions.createHighlighter>>;

let highlighterPromise: Promise<Highlighter> | null = null;

async function getHighlighter(): Promise<Highlighter> {
  if (!highlighterPromise) {
    highlighterPromise = (async () => {
      const highlighter = await codeBlockOptions.createHighlighter();
      const theme = await import('@shikijs/themes/github-dark-default');
      await highlighter.loadTheme(theme.default);
      return highlighter;
    })();
  }
  return highlighterPromise;
}

/** Maps every language id and alias the editor offers to its Shiki id. */
const LANGUAGE_IDS: Record<string, string> = (() => {
  const ids: Record<string, string> = {};
  for (const [id, config] of Object.entries(codeBlockOptions.supportedLanguages)) {
    ids[id.toLowerCase()] = id;
    for (const alias of config.aliases ?? []) ids[alias.toLowerCase()] = id;
  }
  return ids;
})();

/**
 * Reads a code block's source text. `blocksToHTMLLossy` writes line breaks as
 * `<br>`, which `textContent` would silently drop — collapsing a whole block
 * onto one line.
 */
function readSourceText(node: Node): string {
  let text = '';
  for (const child of Array.from(node.childNodes)) {
    if (child.nodeType === Node.TEXT_NODE) text += child.nodeValue ?? '';
    else if ((child as Element).tagName === 'BR') text += '\n';
    else text += readSourceText(child);
  }
  return text;
}

function readLanguage(code: Element): string | null {
  for (const cls of Array.from(code.classList)) {
    if (!cls.startsWith('language-')) continue;
    const id = LANGUAGE_IDS[cls.slice('language-'.length).toLowerCase()];
    if (id) return id;
  }
  return null;
}

/**
 * Rewrites Shiki's inline token colours to `shk-<hex>` classes and returns the
 * markup that belongs inside the original `<code>`.
 */
function toClassBasedMarkup(shikiHtml: string, doc: Document): string | null {
  const parsed = new DOMParser().parseFromString(shikiHtml, 'text/html');
  const code = parsed.querySelector('pre > code');
  if (!code) return null;

  for (const span of Array.from(code.querySelectorAll('[style]'))) {
    const colour = /color:\s*(#[0-9a-fA-F]{6})/.exec(span.getAttribute('style') ?? '');
    span.removeAttribute('style');
    if (colour) span.classList.add(`shk-${colour[1].slice(1).toLowerCase()}`);
  }

  const container = doc.createElement('div');
  container.innerHTML = code.innerHTML;
  return container.innerHTML;
}

/**
 * Highlights every supported code block in `html`, leaving prose, unsupported
 * languages, and already-highlighted blocks untouched. Safe to run repeatedly
 * on its own output.
 */
export async function highlightArticleCodeBlocks(html: string): Promise<string> {
  if (typeof DOMParser === 'undefined' || !html) return html;

  const doc = new DOMParser().parseFromString(html, 'text/html');
  const blocks = Array.from(doc.querySelectorAll('pre > code'))
    .map((code) => ({ code, language: readLanguage(code) }))
    .filter(
      (block): block is { code: Element; language: string } =>
        block.language !== null && !block.code.parentElement?.hasAttribute(HIGHLIGHTED_ATTR),
    );

  if (blocks.length === 0) return html;

  const highlighter = await getHighlighter();

  for (const { code, language } of blocks) {
    try {
      await highlighter.loadLanguage(language as Parameters<Highlighter['loadLanguage']>[0]);
    } catch {
      continue; // Language dropped from the Shiki bundle — leave the block as plain source.
    }

    const shikiHtml = highlighter.codeToHtml(readSourceText(code), {
      lang: language,
      theme: THEME,
    });
    const markup = toClassBasedMarkup(shikiHtml, doc);
    if (markup === null) continue;

    code.innerHTML = markup;
    code.parentElement?.setAttribute(HIGHLIGHTED_ATTR, 'shiki');
  }

  return doc.body.innerHTML;
}
