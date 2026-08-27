export const environment = {
  production: false,
  apiUrl: 'http://localhost:8080',
  // Sentry completely disabled in dev mode — avoids quota spam
  sentryDsn: '',
  sentryEnvironment: 'development',
  appVersion: '0.0.0',
  // Base URL of the user portal, for the "go to the other portal" CTA on the
  userPortalUrl: 'http://localhost:3000',
};
