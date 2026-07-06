import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,       // 10% de transacciones en prod
  replaysOnErrorSampleRate: 1, // replay al 100% en errores
  replaysSessionSampleRate: 0, // no grabar sesiones normales
  integrations: [Sentry.replayIntegration()],
});
