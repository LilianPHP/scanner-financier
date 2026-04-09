import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.2,
  replaysOnErrorSampleRate: 1.0,   // rejoue les sessions avec erreurs
  replaysSessionSampleRate: 0.05,  // 5% des sessions normales
  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,    // masque les données bancaires dans les replays
      blockAllMedia: false,
    }),
  ],
})
