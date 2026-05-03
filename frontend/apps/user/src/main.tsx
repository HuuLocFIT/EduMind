import { StrictMode } from 'react';
import * as ReactDOM from 'react-dom/client';
import * as Sentry from '@sentry/react';
import App from './app/app';
import './styles.css';

// ========================================
// Sentry Init — must be placed before everything else
// ========================================
Sentry.init({
  dsn: import.meta.env['VITE_SENTRY_DSN_USER'],

  // import.meta.env.PROD is Vite built-in — true only in production builds
  // Do NOT use: someEnvVar !== 'development' — undefined !== 'development' is true,
  // which would enable Sentry in local dev if the variable is unset
  enabled: import.meta.env.PROD,

  environment: import.meta.env.PROD ? 'production' : 'development',
  release: `edumind-user@${import.meta.env['VITE_APP_VERSION'] || '0.0.0'}`,

  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration({
      // Mask lesson content (teacher IP) and payment info
      maskAllText: true,
      blockAllMedia: true,
      maskAllInputs: true,
    }),
  ],

  // Sampling strategy tuned for free tier (5k errors / 10k transactions / 50 replays per month)
  tracesSampleRate: 0.1,         // 10% of transactions
  replaysSessionSampleRate: 0,   // No ambient recording
  replaysOnErrorSampleRate: 0.5, // 50% of error sessions
  maxBreadcrumbs: 30,            // Default 100 is too heavy — reduces payload size

  // Only ignore genuine browser noise — do NOT ignore 'Network Error', 'Unauthorized',
  // 'Failed to fetch' — those are real errors we need to know about
  ignoreErrors: [
    'ResizeObserver loop limit exceeded',
    'ResizeObserver loop completed with undelivered notifications',
    /^chrome-extension:\/\//,
    /^moz-extension:\/\//,
  ],

  // Only track errors from our own code
  allowUrls: [
    /https?:\/\/(.*\.)?edumind\.nguyenloc\.dev/,
    /localhost/
  ],

  sendDefaultPii: false,

  beforeSend(event, hint) {
    // Drop ChunkLoadError — browser will retry on reload
    const error = hint?.originalException;
    if (error instanceof Error && error.name === 'ChunkLoadError') {
      return null;
    }

    // Scrub token query params from URLs (reset-password?token=xxx, verify-email?token=xxx)
    if (event.request?.url) {
      event.request.url = event.request.url.replace(
        /([?&])(token|resetToken|code|access_token)=[^&]*/gi,
        '$1$2=[REDACTED]'
      );
    }

    return event;
  },
});

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element not found');
}

const root = ReactDOM.createRoot(rootElement);

// Keep try-catch — Error Boundary cannot run if React hasn't mounted yet
// (chunk load failure, bootstrap crash, etc.)
try {
  root.render(
    <StrictMode>
      <App />
    </StrictMode>
  );
} catch (error) {
  // Capture to Sentry before showing fallback UI
  Sentry.captureException(error, { tags: { phase: 'react-bootstrap' } });
  rootElement.innerHTML = `
    <div style="padding: 20px; font-family: sans-serif; text-align: center;">
      <h1>Application failed to start</h1>
      <p>Please reload the page. If the error persists, contact support.</p>
      <button onclick="location.reload()">Reload</button>
    </div>
  `;
}
