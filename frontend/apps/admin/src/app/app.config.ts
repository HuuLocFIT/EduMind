import { ApplicationConfig, ErrorHandler, provideAppInitializer, inject, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, Router } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import * as Sentry from '@sentry/angular';
import { appRoutes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    // NOTE: provideBrowserGlobalErrorListeners() removed — conflicts with Sentry.createErrorHandler()
    // Both hook into uncaught errors → errors would be processed twice
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(appRoutes),
    provideHttpClient(withInterceptors([authInterceptor])),

    // Sentry replaces Angular's default ErrorHandler
    {
      provide: ErrorHandler,
      useValue: Sentry.createErrorHandler({ showDialog: false }),
    },

    // TraceService tracks route transitions
    // deps: [Router] required — without it, tracking silently does nothing
    {
      provide: Sentry.TraceService,
      deps: [Router],
    },

    // provideAppInitializer forces TraceService to be instantiated eagerly
    // Angular DI is lazy — without this, TraceService never runs
    provideAppInitializer(() => {
      inject(Sentry.TraceService);
    }),
  ],
};
