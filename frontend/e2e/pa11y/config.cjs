'use strict';

const baseUrl = process.env.PA11Y_BASE_URL || 'http://localhost:3000';
const parsedBaseUrl = new URL(baseUrl);
if (!['localhost', '127.0.0.1', '::1'].includes(parsedBaseUrl.hostname)) {
  throw new Error(
    `PA11Y_BASE_URL must target a local app, received: ${parsedBaseUrl.origin}`,
  );
}

// maxIssues is a per-route error budget, not a target: it's the ceiling CI
// enforces today, seeded from the current measured count for each route
// (see e2e/accessibility-reports/before/pa11y for the original Phase 0
// baseline this has already improved on). A route regresses only if it
// exceeds its own maxIssues; remediating a route means lowering its
// maxIssues in the same PR as the fix so the budget never creeps back up.
const routes = [
  {name: 'home', path: '/', readySelector: 'main h1', maxIssues: 0},
  {name: 'courses', path: '/courses', readySelector: 'main', maxIssues: 0},
  {
    name: 'course-detail',
    path: '/courses/pa11y-accessibility-fixture',
    readySelector: 'main h1',
    maxIssues: 0,
  },
  {name: 'login', path: '/login', readySelector: 'form', maxIssues: 0},
  {name: 'signup', path: '/signup', readySelector: 'form', maxIssues: 0},
  {name: 'forgot-password', path: '/forgot-password', readySelector: 'form', maxIssues: 0},
  {
    name: 'reset-password-missing-token',
    path: '/reset-password',
    readySelector: 'h1',
    maxIssues: 0,
  },
  // Flow 3 (Purchase) — synced with e2e/manual-a11y-checklists/03-purchase-flow-safari-voiceover.md
  {
    name: 'cart',
    path: '/cart',
    readySelector: 'main h1',
    requiresAuth: true,
    maxIssues: 0,
  },
  {
    name: 'checkout',
    path: '/checkout',
    readySelector: 'main h1',
    requiresAuth: true,
    maxIssues: 0,
  },
  {
    name: 'checkout-sepay-qr',
    path: '/checkout/sepay-qr?qrUrl=https%3A%2F%2Fsepay.example.test%2Fqr%2Fpa11y.png&orderId=8001&orderNumber=PA11Y-ORDER-SEPAY&amount=490000&currency=VND&bankCode=MB&bankName=MB+Bank&bankAccount=1234567890&accountName=EDUMIND+CO&transferContent=EDUMIND+PA11Y-ORDER-SEPAY',
    readySelector: 'h1',
    requiresAuth: true,
    maxIssues: 0,
  },
  {
    name: 'checkout-success',
    path: '/checkout/success?order=PA11Y-ORDER-001',
    readySelector: 'h1',
    requiresAuth: true,
    maxIssues: 0,
  },
  {
    name: 'checkout-failed',
    path: '/checkout/failed?errorCode=INSTRUMENT_DECLINED&canRetry=true',
    readySelector: 'h1',
    requiresAuth: true,
    maxIssues: 0,
  },
  // Flow 4 (Learning) — synced with e2e/manual-a11y-checklists/04-learning-flow-safari-voiceover.md
  {
    name: 'my-learning',
    path: '/learning',
    readySelector: 'main h1',
    requiresAuth: true,
    maxIssues: 0,
  },
  {
    name: 'course-player',
    path: '/learning/pa11y-accessibility-fixture',
    readySelector: 'main h1',
    requiresAuth: true,
    maxIssues: 0,
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
