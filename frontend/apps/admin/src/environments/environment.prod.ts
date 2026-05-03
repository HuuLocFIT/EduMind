export const environment = {
  production: true,
  apiUrl: 'https://api.edumind.nguyenloc.dev',
  // DSN is not a secret — it's a public endpoint for receiving error events
  // Replace with your actual DSN from Sentry Dashboard → Projects → edumind-admin → DSN
  sentryDsn: 'https://0b7930e1dfc12019b55a167fb018209b@o4511178709270528.ingest.us.sentry.io/4511178734305280',
  sentryEnvironment: 'production',
  // CI injects the real version via sed before build (see .github/workflows/frontend-release.yml)
  appVersion: '0.0.0',
};
