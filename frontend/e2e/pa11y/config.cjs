'use strict';

const baseUrl = process.env.PA11Y_BASE_URL || 'http://localhost:3000';
const parsedBaseUrl = new URL(baseUrl);
if (!['localhost', '127.0.0.1', '::1'].includes(parsedBaseUrl.hostname)) {
  throw new Error(
    `PA11Y_BASE_URL must target a local app, received: ${parsedBaseUrl.origin}`,
  );
}

const routes = [
  {name: 'home', path: '/', readySelector: 'main h1'},
  {name: 'courses', path: '/courses', readySelector: 'main'},
  {
    name: 'course-detail',
    path: '/courses/pa11y-accessibility-fixture',
    readySelector: 'main h1',
  },
  {name: 'login', path: '/login', readySelector: 'form'},
  {name: 'signup', path: '/signup', readySelector: 'form'},
  {name: 'forgot-password', path: '/forgot-password', readySelector: 'form'},
  {
    name: 'reset-password-missing-token',
    path: '/reset-password',
    readySelector: 'h2',
  },
  {
    name: 'checkout-success',
    path: '/checkout/success?order=PA11Y-ORDER-001',
    readySelector: 'h1',
    requiresAuth: true,
  },
  {
    name: 'checkout-failed',
    path: '/checkout/failed?errorCode=INSTRUMENT_DECLINED&canRetry=true',
    readySelector: 'h1',
    requiresAuth: true,
  },
];

module.exports = {
  baseUrl,
  routes,
  reportDirectory: process.env.PA11Y_REPORT_DIR || 'e2e/pa11y/reports',
  pa11yOptions: {
    standard: 'WCAG2AA',
    timeout: Number(process.env.PA11Y_TIMEOUT || 60_000),
    wait: 250,
    viewport: {
      width: 1280,
      height: 1024,
      deviceScaleFactor: 1,
      isMobile: false,
    },
    includeNotices: false,
    includeWarnings: false,
  },
};
