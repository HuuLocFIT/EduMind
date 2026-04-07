import { bootstrapApplication } from '@angular/platform-browser';
import * as Sentry from '@sentry/angular';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { environment } from './environments/environment';

// ========================================
// Sentry Init
// Angular uses environment.ts — do NOT use import.meta.env
// Angular build uses esbuild, not Vite → import.meta.env is not injected
// ========================================
Sentry.init({
  dsn: environment.sentryDsn,
  enabled: environment.production,
  environment: environment.sentryEnvironment,
  release: `edumind-admin@${environment.appVersion}`,

  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
      maskAllInputs: true,
    }),
  ],

  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0.5,
  maxBreadcrumbs: 30,

  ignoreErrors: [
    'ResizeObserver loop limit exceeded',
    'ResizeObserver loop completed with undelivered notifications',
    /^chrome-extension:\/\//,
    /^moz-extension:\/\//,
  ],

  allowUrls: [
    /https?:\/\/(.*\.)?edumind\.nguyenloc\.dev/,
    /localhost/
  ],

  sendDefaultPii: false,

  beforeSend(event, hint) {
    const error = hint?.originalException;
    if (error instanceof Error && error.name === 'ChunkLoadError') {
      return null;
    }
    if (event.request?.url) {
      event.request.url = event.request.url.replace(
        /([?&])(token|resetToken|code|access_token)=[^&]*/gi,
        '$1$2=[REDACTED]'
      );
    }
    return event;
  },
});

bootstrapApplication(App, appConfig).catch((err) => console.error(err));
