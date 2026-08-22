/// <reference types="vite/client" />

interface Window {
  /** Set only in Puppeteer's isolated prerender browser context. */
  __EDUMIND_PRERENDER__?: boolean;
}
